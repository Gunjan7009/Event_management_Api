require("dotenv").config();

const Event = require("../../src/models/Event");
const User = require("../../src/models/User");
const Registration = require("../../src/models/Registration");

const {
  registerForEvent,
} = require("../../src/controllers/registrationController");
const { sendRegistrationEmail } = require("../../src/services/emailService");
const {
  checkAgeEligibility,
} = require("../../src/services/eligibilityService");

const {
  ids,
  createRes,
  createNext,
  event,
  user,
  attendees,
  populatedEvent,
  populateResult,
} = require("../helpers/testData");

jest.mock("../../src/models/Event");
jest.mock("../../src/models/User");
jest.mock("../../src/models/Registration");
jest.mock("../../src/services/emailService");
jest.mock("../../src/services/eligibilityService");

describe("registerForEvent", () => {
  const buildReq = ({ id = ids.eventId, body } = {}) => ({
    params: { id },
    body: body ?? { attendees, numberOfPeople: 1 },
    user: { userId: ids.userId },
  });

  const run = async (req) => {
    const res = createRes();
    const next = createNext();

    await registerForEvent(req, res, next);

    return { res, next };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    Event.findById.mockReturnValue(populateResult(event));
    User.findById.mockResolvedValue(user);
    Registration.findOne.mockResolvedValue(null);
    Registration.find.mockResolvedValue([]);
    checkAgeEligibility.mockReturnValue({ eligible: true, age: 27 });
    sendRegistrationEmail.mockResolvedValue();
  });

  describe("successful registration", () => {
    const registration = {
      _id: ids.registrationId,
      eventId: ids.eventId,
      registeredBy: ids.userId,
      attendees,
      numberOfPeople: 1,
      status: "confirmed",
    };

    test("should register for an event successfully", async () => {
      const eventWithOrganizer = populatedEvent();

      Event.findById.mockReturnValue(populateResult(eventWithOrganizer));
      Registration.create.mockResolvedValue(registration);

      const { res } = await run(buildReq());

      expect(Registration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: ids.eventId,
          registeredBy: ids.userId,
          numberOfPeople: 1,
          status: "confirmed",
        }),
      );

      expect(sendRegistrationEmail).toHaveBeenCalledWith(
        registration,
        eventWithOrganizer,
        { registrantEmail: user.email },
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Registration successful",
          emailSent: true,
        }),
      );
    });

    test("should still succeed and report emailSent false when the email fails", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      Registration.create.mockResolvedValue(registration);
      sendRegistrationEmail.mockRejectedValue(new Error("SMTP unavailable"));

      const { res } = await run(buildReq());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, emailSent: false }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("request validation", () => {
    test("should reject invalid event ID", async () => {
      const { res } = await run(buildReq({ id: "invalid-id" }));

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Event.findById).not.toHaveBeenCalled();
      expect(Registration.create).not.toHaveBeenCalled();
    });

    test("should reject empty attendees", async () => {
      const { res } = await run(
        buildReq({ body: { attendees: [], numberOfPeople: 1 } }),
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Registration.create).not.toHaveBeenCalled();
    });

    test("should reject invalid attendee email", async () => {
      const { res } = await run(
        buildReq({
          body: {
            attendees: [
              {
                name: "John Doe",
                email: "invalid-email",
                dateOfBirth: "1998-01-01",
              },
            ],
            numberOfPeople: 1,
          },
        }),
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Registration.create).not.toHaveBeenCalled();
    });
  });

  describe("business rules", () => {
    test("should reject registration for a cancelled event", async () => {
      Event.findById.mockReturnValue(
        populateResult({ ...event, status: "cancelled" }),
      );

      const { res } = await run(buildReq());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Registration.create).not.toHaveBeenCalled();
    });

    test("should reject duplicate registration", async () => {
      Registration.findOne.mockResolvedValue({
        _id: "existing-registration",
        status: "confirmed",
      });

      const { res } = await run(buildReq());

      expect(res.status).toHaveBeenCalledWith(409);
      expect(Registration.create).not.toHaveBeenCalled();
    });

    test("should reject registration when capacity is full", async () => {
      Registration.find.mockResolvedValue([
        { numberOfPeople: 10, status: "confirmed" },
      ]);

      const { res } = await run(buildReq());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Not enough seats available",
      });
      expect(Registration.create).not.toHaveBeenCalled();
    });
  });

  describe("concurrency and error handling", () => {
    test("should return 409 when the database rejects a duplicate (race condition)", async () => {
      Registration.create.mockRejectedValue(
        Object.assign(new Error("E11000 duplicate key error"), { code: 11000 }),
      );

      const { res, next } = await run(buildReq());

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You are already registered for this event",
      });
      expect(sendRegistrationEmail).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test("should pass unexpected database errors to the error handler", async () => {
      const dbError = new Error("connection lost");

      Registration.create.mockRejectedValue(dbError);

      const { res, next } = await run(buildReq());

      expect(next).toHaveBeenCalledWith(dbError);
      expect(res.status).not.toHaveBeenCalled();
      expect(sendRegistrationEmail).not.toHaveBeenCalled();
    });
  });
});
