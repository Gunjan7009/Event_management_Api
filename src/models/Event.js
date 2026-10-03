const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
    },

    mode: {
      type: String,
      enum: ["virtual", "in-person", "hybrid"],
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    location: {
      venue: {
        type: String,
        trim: true,
      },

      address: {
        type: String,
        trim: true,
      },

      meetingLink: {
        type: String,
        trim: true,
      },
    },

    eligibility: {
      minAge: {
        type: Number,
        min: 0,
      },

      maxAge: {
        type: Number,
        min: 0,
      },
    },

    registrationRules: {
      maxParticipants: {
        type: Number,
        min: 1,
      },

      maxPeoplePerRegistration: {
        type: Number,
        min: 1,
        default: 1,
      },

      registrationDeadline: {
        type: Date,
      },
    },

    requirements: {
      thingsToBring: {
        type: [String],
        default: [],
      },
    },

    rules: {
      allowed: {
        type: [String],
        default: [],
      },

      notAllowed: {
        type: [String],
        default: [],
      },
    },

    termsAndConditions: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["published", "cancelled", "completed"],
      default: "published",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Event", eventSchema);
