# Event Management API

A RESTful backend API for managing virtual and in-person events, user authentication, event registrations, participants, and email notifications.

Built with **Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, and Nodemailer**.

---

## Features

### Authentication

- User registration and login
- Password hashing using bcrypt
- JWT-based authentication
- Role-based authorization
- Organizer and attendee roles

### Event Management

Organizers can:

- Create events
- View events
- Update their own events
- Delete their own events

Events support:

- Virtual, in-person, and hybrid modes
- Event type
- Date and time
- Location and meeting link
- Age-based eligibility
- Participant limits
- Registration deadline
- Requirements and rules

### Event Registration

Authenticated users can:

- Register for events
- Register multiple attendees
- View their registrations
- Cancel their registrations

Organizers can:

- View registrations for their own events
- Cancel registrations for attendees of their events

The registration system validates:

- Attendee details
- Email format
- Date of birth
- Age eligibility
- Registration deadline
- Duplicate registrations
- Event capacity
- Maximum people per registration

### Email Notifications

- Registration confirmation emails
- Registration cancellation emails
- Virtual event meeting details
- In-person venue and address details
- Organizer information
- Registration details

Implemented using **Nodemailer**.

### Validation & Error Handling

- Request validation
- MongoDB ObjectId validation
- Email validation
- Date and time validation
- URL validation
- Authentication and authorization errors
- Centralized error handling

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Backend runtime |
| Express.js | REST API |
| MongoDB | Database |
| Mongoose | MongoDB ODM |
| bcrypt | Password hashing |
| JWT | Authentication |
| Nodemailer | Email notifications |
| dotenv | Environment variables |
| Jest | Testing |
| Supertest | API testing |
| Nodemon | Development |

---

## Project Structure

```text
event-management-api/
│
├── src/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── eventController.js
│   │   └── registrationController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   └── errorMiddleware.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Event.js
│   │   └── Registration.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── eventRoutes.js
│   │   └── registrationRoutes.js
│   │
│   ├── services/
│   │   ├── eligibilityService.js
│   │   └── emailService.js
│   │
│   ├── utils/
│   │   └── validation.js
│   │
│   └── app.js
│
├── test/
├── server.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md