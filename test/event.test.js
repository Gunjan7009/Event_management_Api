require("dotenv").config();

const Event = require("../src/models/Event");
const Registration = require("../src/models/Registration");

const {
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
} = require("../src/controllers/eventController");

jest.mock("../src/models/Event");
jest.mock("../src/models/Registration");

describe("Event Controller", () => {
  const createRes = () => {
    const res = {};

    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);

    return res;
  };

  const createNext = () => jest.fn();

  const organizerId = "507f1f77bcf86cd799439011";
  const eventId = "507f1f77bcf86cd799439012";

  const validEventBody = {
    title: "Node.js Conference",
    description: "Backend engineering event",
    type: "conference",
    mode: "virtual",
    date: "2099-12-20",

    startTime: "10:00 AM",
    endTime: "12:00 PM",

    eligibility: {
      minAge: 18,
      maxAge: 60,
    },

    registrationRules: {
      maxParticipants: 10,
      maxPeoplePerRegistration: 2,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should create an event successfully", async () => {
    const req = {
      body: validEventBody,
      user: {
        userId: organizerId,
      },
    };

    const res = createRes();
    const next = createNext();

    const createdEvent = {
      _id: eventId,
      ...validEventBody,
      organizerId,
      status: "published",
    };

    Event.create.mockResolvedValue(createdEvent);

    await createEvent(req, res, next);

    expect(Event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Node.js Conference",
        organizerId,
        status: "published",
      }),
    );

    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Event created successfully",
      }),
    );
  });

  test("should reject an event with a past date", async () => {
    const req = {
      body: {
        ...validEventBody,
        date: "2020-01-01",
      },

      user: {
        userId: organizerId,
      },
    };

    const res = createRes();
    const next = createNext();

    await createEvent(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(Event.create).not.toHaveBeenCalled();
  });

  test("should reject an invalid time range", async () => {
    const req = {
      body: {
        ...validEventBody,

        startTime: "02:00 PM",
        endTime: "12:00 PM",
      },

      user: {
        userId: organizerId,
      },
    };

    const res = createRes();
    const next = createNext();

    await createEvent(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(Event.create).not.toHaveBeenCalled();
  });

  test("should return 400 for invalid event ID", async () => {
    const req = {
      params: {
        id: "invalid-id",
      },
    };

    const res = createRes();
    const next = createNext();

    await getEventById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(Event.findById).not.toHaveBeenCalled();
  });

  test("should return an event by ID", async () => {
    const req = {
      params: {
        id: eventId,
      },
    };

    const res = createRes();
    const next = createNext();

    const event = {
      _id: eventId,
      title: "Node.js Conference",
    };

    const populate = jest.fn().mockResolvedValue(event);

    Event.findById.mockReturnValue({
      populate,
    });

    await getEventById(req, res, next);

    expect(Event.findById).toHaveBeenCalledWith(eventId);

    expect(populate).toHaveBeenCalledWith("organizerId", "name email");

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      event,
    });
  });

  test("should prevent updating an event owned by another organizer", async () => {
    const req = {
      params: {
        id: eventId,
      },

      body: {
        title: "Updated Event",
      },

      user: {
        userId: organizerId,
      },
    };

    const res = createRes();
    const next = createNext();

    Event.findById.mockResolvedValue({
      _id: eventId,

      organizerId: "507f1f77bcf86cd799439013",

      title: "Original Event",

      description: "Description",

      type: "conference",

      mode: "virtual",

      date: new Date("2099-12-20"),

      startTime: "10:00 AM",

      endTime: "06:00 PM",

      eligibility: {},

      registrationRules: {},
    });

    await updateEvent(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);

    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("should prevent reducing capacity below current participants", async () => {
    const req = {
      params: {
        id: eventId,
      },

      body: {
        registrationRules: {
          maxParticipants: 2,
        },
      },

      user: {
        userId: organizerId,
      },
    };

    const res = createRes();
    const next = createNext();

    const event = {
      _id: eventId,

      organizerId: {
        toString: () => organizerId,
      },

      title: "Conference",

      description: "Description",

      type: "conference",

      mode: "virtual",

      date: new Date("2099-12-20"),

      startTime: "10:00 AM",
      endTime: "12:00 PM",

      eligibility: {},

      registrationRules: {
        maxParticipants: 10,
        maxPeoplePerRegistration: 2,
      },
    };

    Event.findById.mockResolvedValue(event);

    Registration.find.mockResolvedValue([
      {
        numberOfPeople: 2,
        status: "confirmed",
      },

      {
        numberOfPeople: 1,
        status: "confirmed",
      },
    ]);

    await updateEvent(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      success: false,

      message:
        "Maximum participants cannot be less than current registered participants (3)",
    });

    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("should update an event with a valid capacity", async () => {
    const req = {
      params: {
        id: eventId,
      },

      body: {
        registrationRules: {
          maxParticipants: 20,
        },
      },

      user: {
        userId: organizerId,
      },
    };

    const res = createRes();
    const next = createNext();

    const event = {
      _id: eventId,

      organizerId: {
        toString: () => organizerId,
      },

      title: "Conference",

      description: "Description",

      type: "conference",

      mode: "virtual",

      date: new Date("2099-12-20"),

      // Updated time format
      startTime: "10:00 AM",
      endTime: "12:00 PM",

      eligibility: {},

      registrationRules: {
        maxParticipants: 10,
        maxPeoplePerRegistration: 2,
      },
    };

    Event.findById.mockResolvedValue(event);

    Registration.find.mockResolvedValue([
      {
        numberOfPeople: 2,
        status: "confirmed",
      },
    ]);

    Event.findByIdAndUpdate.mockResolvedValue({
      ...event,

      registrationRules: {
        maxParticipants: 20,
        maxPeoplePerRegistration: 2,
      },
    });

    await updateEvent(req, res, next);

    expect(Event.findByIdAndUpdate).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("should delete an event and its registrations", async () => {
    const req = {
      params: {
        id: eventId,
      },

      user: {
        userId: organizerId,
      },
    };

    const res = createRes();
    const next = createNext();

    const event = {
      _id: eventId,

      organizerId: {
        toString: () => organizerId,
      },

      deleteOne: jest.fn().mockResolvedValue(),
    };

    Event.findById.mockResolvedValue(event);

    Registration.deleteMany.mockResolvedValue({
      deletedCount: 2,
    });

    await deleteEvent(req, res, next);

    expect(Registration.deleteMany).toHaveBeenCalledWith({
      eventId: eventId,
    });

    expect(event.deleteOne).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("should reject deleting an event owned by another organizer", async () => {
    const req = {
      params: {
        id: eventId,
      },

      user: {
        userId: organizerId,
      },
    };

    const res = createRes();
    const next = createNext();

    Event.findById.mockResolvedValue({
      _id: eventId,

      organizerId: {
        toString: () => "507f1f77bcf86cd799439013",
      },
    });

    await deleteEvent(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);

    expect(Registration.deleteMany).not.toHaveBeenCalled();
  });
});
