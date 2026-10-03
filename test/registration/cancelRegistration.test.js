require("dotenv").config();

const Event = require("../../src/models/Event");
const Registration = require("../../src/models/Registration");
const {
  cancelAttendeeRegistration,
} = require("../../src/controllers/registrationController");
const { sendCancellationEmail } = require("../../src/services/emailService");

const {
  ids,
  createRes,
  createNext,
  populatedEvent,
  populateResult,
  buildRegistration,
} = require("../helpers/testData");

jest.mock("../../src/models/Event");
jest.mock("../../src/models/Registration");
jest.mock("../../src/services/emailService");

describe("cancelAttendeeRegistration", () => {
  const run = async ({ requesterId, registration, eventDoc }) => {
    const req = {
      params: { id: ids.registrationId },
      user: { userId: requesterId },
    };
    const res = createRes();
    const next = createNext();

    Registration.findById.mockResolvedValue(registration);
    Event.findById.mockReturnValue(populateResult(eventDoc));

    await cancelAttendeeRegistration(req, res, next);

    return { res, next };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sendCancellationEmail.mockResolvedValue();
  });

  describe("allowed cancellations", () => {
    test("should cancel the user's own registration", async () => {
      const registration = buildRegistration({ registeredBy: ids.userId });
      const eventDoc = populatedEvent(ids.userId);

      const { res } = await run({
        requesterId: ids.userId,
        registration,
        eventDoc,
      });

      expect(registration.status).toBe("cancelled");
      expect(registration.save).toHaveBeenCalled();
      expect(sendCancellationEmail).toHaveBeenCalledWith(
        registration,
        eventDoc,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("should allow the organizer to cancel a registration for their own event", async () => {
      const registration = buildRegistration({ registeredBy: ids.userId });
      const eventDoc = populatedEvent(
        ids.otherUserId,
        "Event Organizer",
        "organizer@example.com",
      );

      const { res } = await run({
        requesterId: ids.otherUserId,
        registration,
        eventDoc,
      });

      expect(registration.status).toBe("cancelled");
      expect(registration.save).toHaveBeenCalled();
      expect(sendCancellationEmail).toHaveBeenCalledWith(
        registration,
        eventDoc,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("forbidden cancellations", () => {
    test.each([
      [
        "another user's registration",
        {
          requesterId: ids.userId,
          registeredBy: ids.otherUserId,
          organizerId: ids.otherOrganizerId,
        },
      ],
      [
        "a registration for another organizer's event",
        {
          requesterId: ids.otherUserId,
          registeredBy: ids.userId,
          organizerId: ids.otherOrganizerId,
        },
      ],
    ])("should prevent cancelling %s", async (_label, scenario) => {
      const registration = buildRegistration({
        registeredBy: scenario.registeredBy,
      });

      const { res } = await run({
        requesterId: scenario.requesterId,
        registration,
        eventDoc: populatedEvent(
          scenario.organizerId,
          "Another Organizer",
          "another@example.com",
        ),
      });

      expect(res.status).toHaveBeenCalledWith(403);
      expect(registration.status).toBe("confirmed");
      expect(registration.save).not.toHaveBeenCalled();
      expect(sendCancellationEmail).not.toHaveBeenCalled();
    });
  });

  describe("invalid requests", () => {
    test("should reject invalid registration ID", async () => {
      const req = {
        params: { id: "invalid-id" },
        user: { userId: ids.userId },
      };
      const res = createRes();

      await cancelAttendeeRegistration(req, res, createNext());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Registration.findById).not.toHaveBeenCalled();
    });

    test("should reject cancelling an already cancelled registration", async () => {
      const registration = buildRegistration({ status: "cancelled" });

      const { res } = await run({
        requesterId: ids.userId,
        registration,
        eventDoc: populatedEvent(),
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(registration.save).not.toHaveBeenCalled();
      expect(sendCancellationEmail).not.toHaveBeenCalled();
    });
  });
});
