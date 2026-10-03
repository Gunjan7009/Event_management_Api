const express = require("express");

const { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent } = require("../controllers/eventController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/events", authenticate, authorizeRole("organizer"), createEvent);
router.get("/events", getAllEvents);
router.get("/events/:id", getEventById);
router.put("/events/:id", authenticate, authorizeRole("organizer"), updateEvent);
router.delete("/events/:id", authenticate, authorizeRole("organizer"), deleteEvent);

module.exports = router;
