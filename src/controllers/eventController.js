const Event = require("../models/Event");
const Registration = require("../models/Registration");

const { isValidObjectId } = require("../utils/validation");

const convertTimeToMinutes = (time) => {
  const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  return hours * 60 + minutes;
};

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
};

const UPDATABLE_FIELDS = [
  "title",
  "description",
  "type",
  "mode",
  "date",
  "startTime",
  "endTime",
  "location",
  "requirements",
  "rules",
  "termsAndConditions",
  "status",
];

const validateEventData = ({
  title,
  description,
  type,
  mode,
  date,
  startTime,
  endTime,
  location,
  eligibility,
  registrationRules,
}) => {
  if (!title || !description || !type || !mode) {
    return "Title, description, type and mode are required";
  }

  const eventDate = new Date(date);

  if (Number.isNaN(eventDate.getTime())) {
    return "Invalid event date";
  }

  if (eventDate < new Date()) {
    return "Event date cannot be in the past";
  }

  const timeRegex = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i;

  if (
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    !timeRegex.test(startTime) ||
    !timeRegex.test(endTime)
  ) {
    return "Invalid time format. Use hh:mm AM/PM";
  }

  const startMinutes = convertTimeToMinutes(startTime);
  const endMinutes = convertTimeToMinutes(endTime);

  if (startMinutes >= endMinutes) {
    return "Start time must be before end time";
  }

  if (
    location?.meetingLink &&
    (typeof location.meetingLink !== "string" ||
      !isValidHttpUrl(location.meetingLink))
  ) {
    return "Meeting link must be a valid http or https URL";
  }

  if (
    eligibility?.minAge !== undefined &&
    eligibility?.maxAge !== undefined &&
    eligibility.minAge > eligibility.maxAge
  ) {
    return "Minimum age cannot be greater than maximum age";
  }

  if (
    registrationRules?.maxParticipants !== undefined &&
    registrationRules.maxParticipants < 1
  ) {
    return "Maximum participants must be at least 1";
  }

  if (
    registrationRules?.maxPeoplePerRegistration !== undefined &&
    registrationRules.maxPeoplePerRegistration < 1
  ) {
    return "Maximum people per registration must be at least 1";
  }

  if (
    registrationRules?.maxParticipants !== undefined &&
    registrationRules?.maxPeoplePerRegistration !== undefined &&
    registrationRules.maxPeoplePerRegistration >
      registrationRules.maxParticipants
  ) {
    return "Maximum people per registration cannot exceed maximum participants";
  }

  if (registrationRules?.registrationDeadline) {
    const deadline = new Date(registrationRules.registrationDeadline);

    if (Number.isNaN(deadline.getTime())) {
      return "Invalid registration deadline";
    }

    if (deadline >= eventDate) {
      return "Registration deadline must be before event date";
    }
  }

  return null;
};

const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      mode,
      date,
      startTime,
      endTime,
      location,
      eligibility,
      registrationRules,
      requirements,
      rules,
      termsAndConditions,
    } = req.body;

    const validationError = validateEventData({
      title,
      description,
      type,
      mode,
      date,
      startTime,
      endTime,
      location,
      eligibility,
      registrationRules,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      type: type.trim(),
      mode,
      date,
      startTime,
      endTime,
      organizerId: req.user.userId,
      location,
      eligibility,
      registrationRules,
      requirements,
      rules,
      termsAndConditions,
      status: "published",
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    next(error);
  }
};

const getAllEvents = async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate("organizerId", "name email")
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    next(error);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id).populate(
      "organizerId",
      "name email",
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own events",
      });
    }

    const finalDate = req.body.date ?? event.date;

    const finalStartTime = req.body.startTime ?? event.startTime;

    const finalEndTime = req.body.endTime ?? event.endTime;

    const finalEligibility = {
      ...(event.eligibility?.toObject?.() || event.eligibility || {}),
      ...(req.body.eligibility || {}),
    };

    const finalRegistrationRules = {
      ...(event.registrationRules?.toObject?.() ||
        event.registrationRules ||
        {}),
      ...(req.body.registrationRules || {}),
    };

    const validationError = validateEventData({
      title: req.body.title ?? event.title,
      description: req.body.description ?? event.description,
      type: req.body.type ?? event.type,
      mode: req.body.mode ?? event.mode,
      date: finalDate,
      startTime: finalStartTime,
      endTime: finalEndTime,
      location: req.body.location ?? event.location,
      eligibility: finalEligibility,
      registrationRules: finalRegistrationRules,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // Check current registered participants
    // before allowing capacity reduction.
    const newMaxParticipants = finalRegistrationRules.maxParticipants;

    if (newMaxParticipants !== undefined) {
      const registrations = await Registration.find({
        eventId: event._id,
        status: { $ne: "cancelled" },
      });

      const currentParticipants = registrations.reduce(
        (total, registration) => total + registration.numberOfPeople,
        0,
      );

      if (newMaxParticipants < currentParticipants) {
        return res.status(400).json({
          success: false,
          message: `Maximum participants cannot be less than current registered participants (${currentParticipants})`,
        });
      }
    }

    const updates = {};

    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      {
        ...updates,
        eligibility: finalEligibility,
        registrationRules: finalRegistrationRules,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own events",
      });
    }

    await Registration.deleteMany({
      eventId: event._id,
    });

    await event.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
