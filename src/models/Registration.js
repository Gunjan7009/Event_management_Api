const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    attendees: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        name: {
          type: String,
          required: true,
        },

        email: {
          type: String,
          required: true,
        },

        dateOfBirth: {
          type: Date,
          required: true,
        },
      },
    ],

    numberOfPeople: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

registrationSchema.index({
  eventId: 1,
});

registrationSchema.index({
  registeredBy: 1,
});

registrationSchema.index(
  { eventId: 1, registeredBy: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "confirmed" },
  },
);

module.exports = mongoose.model("Registration", registrationSchema);
