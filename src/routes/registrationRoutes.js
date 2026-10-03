const express = require("express");
const authorizeRole = require("../middleware/roleMiddleware");

const {
  registerForEvent,
  getMyRegistrations,
  getEventRegistrations,
  cancelAttendeeRegistration,
} = require("../controllers/registrationController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/events/:id/register", authenticate, registerForEvent);
router.get("/registrations", authenticate, getMyRegistrations);
router.get("/events/:eventId/registrations",
  authenticate,
  authorizeRole("organizer"),
  getEventRegistrations,
);
router.delete("/registrations/:id", authenticate, cancelAttendeeRegistration);

module.exports = router;
