const Event = require("../models/Event");
const User = require("../models/User");
const Registration = require("../models/Registration");

const {
  isValidEmail,
  isDateOfBirthValid,
  isValidObjectId,
} = require("../utils/validation");

const {
  sendRegistrationEmail,
  sendCancellationEmail,
} = require("../services/emailService");

const { checkAgeEligibility } = require("../services/eligibilityService");

const registerForEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attendees } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (!Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one attendee is required",
      });
    }

    const numberOfPeople = attendees.length;

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

    if (event.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "This event has been cancelled and registration is no longer available",
      });
    }

    if (event.status === "completed") {
      return res.status(400).json({
        success: false,
        message:
          "This event has already been completed and registration is closed",
      });
    }

    if (
      event.registrationRules?.registrationDeadline &&
      new Date() > event.registrationRules.registrationDeadline
    ) {
      return res.status(400).json({
        success: false,
        message: "Registration deadline has passed",
      });
    }

    const maxPeoplePerRegistration =
      event.registrationRules?.maxPeoplePerRegistration || 1;

    if (numberOfPeople > maxPeoplePerRegistration) {
      return res.status(400).json({
        success: false,
        message: `You can register a maximum of ${maxPeoplePerRegistration} people`,
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    for (const attendee of attendees) {
      if (!attendee.name || !attendee.email || !attendee.dateOfBirth) {
        return res.status(400).json({
          success: false,
          message: "Each attendee must have name, email and dateOfBirth",
        });
      }

      if (
        typeof attendee.name !== "string" ||
        typeof attendee.email !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Attendee name and email must be strings",
        });
      }

      if (!isValidEmail(attendee.email)) {
        return res.status(400).json({
          success: false,
          message: `${attendee.name}: Invalid email address`,
        });
      }

      if (!isDateOfBirthValid(attendee.dateOfBirth)) {
        return res.status(400).json({
          success: false,
          message: `${attendee.name}: Invalid date of birth`,
        });
      }

      const eligibilityResult = checkAgeEligibility(
        attendee.dateOfBirth,
        event.eligibility,
      );

      if (!eligibilityResult.eligible) {
        return res.status(400).json({
          success: false,
          message: `${attendee.name}: ${eligibilityResult.message}`,
        });
      }
    }

    const existingRegistration = await Registration.findOne({
      eventId: event._id,
      registeredBy: req.user.userId,
      status: { $ne: "cancelled" },
    });

    if (existingRegistration) {
      return res.status(409).json({
        success: false,
        message: "You are already registered for this event",
      });
    }

    const registrations = await Registration.find({
      eventId: event._id,
      status: { $ne: "cancelled" },
    });

    const currentParticipants = registrations.reduce(
      (total, registration) => total + registration.numberOfPeople,
      0,
    );

    const maxParticipants = event.registrationRules?.maxParticipants;

    if (
      maxParticipants &&
      currentParticipants + numberOfPeople > maxParticipants
    ) {
      return res.status(400).json({
        success: false,
        message: "Not enough seats available",
      });
    }

    let registration;

    try {
      registration = await Registration.create({
        eventId: event._id,

        registeredBy: req.user.userId,

        attendees: attendees.map((attendee) => ({
          name: attendee.name.trim(),
          email: attendee.email.trim().toLowerCase(),
          dateOfBirth: attendee.dateOfBirth,
        })),

        numberOfPeople,

        status: "confirmed",
      });
    } catch (createError) {
      if (createError.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You are already registered for this event",
        });
      }

      throw createError;
    }

    let emailSent = true;

    try {
      await sendRegistrationEmail(registration, event, {
        registrantEmail: user.email,
      });
    } catch (emailError) {
      emailSent = false;

      console.error("Registration email failed:", emailError.message);
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      emailSent,
      registration,
    });
  } catch (error) {
    next(error);
  }
};

const getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({
      registeredBy: req.user.userId,
    })
      .populate("eventId", "title date startTime endTime type mode status")
      .sort({
        registeredAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: registrations.length,
      registrations,
    });
  } catch (error) {
    next(error);
  }
};

const getEventRegistrations = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    if (!isValidObjectId(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only view registrations for your own events",
      });
    }

    const registrations = await Registration.find({
      eventId: event._id,
    })
      .populate("registeredBy", "name email")
      .sort({
        registeredAt: -1,
      });

    return res.status(200).json({
      success: true,

      event: {
        id: event._id,
        title: event.title,
      },

      count: registrations.length,

      registrations,
    });
  } catch (error) {
    next(error);
  }
};

const cancelAttendeeRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration ID",
      });
    }

    const registration = await Registration.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    if (registration.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Registration is already cancelled",
      });
    }

    const event = await Event.findById(registration.eventId).populate(
      "organizerId",
      "name email",
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const isRegistrationOwner =
      registration.registeredBy.toString() === req.user.userId;

    const isEventOrganizer =
      event.organizerId._id.toString() === req.user.userId;

    if (!isRegistrationOwner && !isEventOrganizer) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this registration",
      });
    }

    registration.status = "cancelled";

    await registration.save();

    let emailSent = true;

    try {
      await sendCancellationEmail(registration, event);
    } catch (emailError) {
      emailSent = false;

      console.error("Cancellation email failed:", emailError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Registration cancelled successfully",
      emailSent,
      registration,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  getEventRegistrations,
  cancelAttendeeRegistration,
};
