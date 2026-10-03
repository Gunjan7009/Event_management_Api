// Shared test data and builders for the registration tests.
// This file is not a test itself (it does not match *.test.js), so Jest only
// loads it when a test file requires it.

const ids = {
  eventId: "507f1f77bcf86cd799439011",
  userId: "507f1f77bcf86cd799439012",
  registrationId: "507f1f77bcf86cd799439013",
  otherUserId: "507f1f77bcf86cd799439014",
  otherOrganizerId: "507f1f77bcf86cd799439015",
};

const createRes = () => {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

const createNext = () => jest.fn();

const event = {
  _id: ids.eventId,
  title: "Node.js Conference",
  status: "published",
  organizerId: ids.userId,
  date: new Date("2026-11-20"),
  startTime: "10:00 AM",
  endTime: "01:00 PM",
  mode: "virtual",
  location: { meetingLink: "https://example.com/meeting" },
  eligibility: { minAge: 18, maxAge: 60 },
  registrationRules: { maxParticipants: 10, maxPeoplePerRegistration: 2 },
};

const user = {
  _id: ids.userId,
  name: "John Doe",
  email: "john@example.com",
  dateOfBirth: new Date("1998-01-01"),
};

const attendees = [
  { name: "John Doe", email: "john@example.com", dateOfBirth: "1998-01-01" },
];

const populatedEvent = (
  organizerId = ids.userId,
  name = "John Doe",
  email = "john@example.com",
) => ({
  ...event,
  organizerId: { _id: organizerId, name, email },
});

const populateResult = (value) => ({
  populate: jest.fn().mockResolvedValue(value),
});

const buildRegistration = ({
  registeredBy = ids.userId,
  status = "confirmed",
} = {}) => ({
  _id: ids.registrationId,
  registeredBy: { toString: () => registeredBy },
  eventId: ids.eventId,
  status,
  save: jest.fn().mockResolvedValue(),
});

module.exports = {
  ids,
  createRes,
  createNext,
  event,
  user,
  attendees,
  populatedEvent,
  populateResult,
  buildRegistration,
};
