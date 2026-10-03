require("dotenv").config();

const Event = require("../../src/models/Event");
const Registration = require("../../src/models/Registration");
const {
  getEventRegistrations,
} = require("../../src/controllers/registrationController");
const { ids, createRes, createNext, event } = require("../helpers/testData");

jest.mock("../../src/models/Event");
jest.mock("../../src/models/Registration");

describe("getEventRegistrations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should prevent an organizer from viewing registrations of another organizer's event", async () => {
    const req = {
      params: { eventId: ids.eventId },
      user: { userId: ids.userId },
    };
    const res = createRes();
    const next = createNext();

    Event.findById.mockResolvedValue({
      ...event,
      organizerId: ids.otherUserId,
    });

    await getEventRegistrations(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Registration.find).not.toHaveBeenCalled();
  });
});
