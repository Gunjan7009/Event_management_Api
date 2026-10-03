# Event Management API

A RESTful backend for managing events, organizers, attendees,
registrations, eligibility rules, participant limits, and email
notifications.

Built with **Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, and
Nodemailer**.

## Features

-   User registration and login
-   Secure password hashing with bcrypt
-   JWT-based authentication
-   Role-based authorization
    -   `organizer`
    -   `attendee`
-   Organizer-only event creation, update, and deletion
-   Public event listing and event details
-   Event ownership validation
-   Event date and time validation
-   Virtual, in-person, and hybrid event modes
-   Registration deadline support
-   Maximum participants support
-   Maximum people per registration support
-   Age-based attendee eligibility
-   Duplicate registration prevention
-   Registration cancellation
-   Organizer access to registrations for their own events
-   Automatic cleanup of registrations when an event is deleted
-   Registration confirmation emails
-   Registration cancellation emails
-   Graceful handling when email delivery fails
-   MongoDB indexes for registration lookups and duplicate prevention
-   Centralized error handling
-   Input and ObjectId validation
-   Jest and Supertest test suite

------------------------------------------------------------------------

## Tech Stack

  Technology   Purpose
  ------------ ---------------------
  Node.js      JavaScript runtime
  Express.js   REST API framework
  MongoDB      Database
  Mongoose     MongoDB ODM
  JWT          Authentication
  bcrypt       Password hashing
  Nodemailer   Email notifications
  Jest         Testing
  Supertest    API testing
  Nodemon      Development server

------------------------------------------------------------------------

## Project Architecture

The project follows a simple MVC/service-based structure:

``` text
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
│   │   ├── errorMiddleware.js
│   │   └── roleMiddleware.js
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
│   ├── auth.test.js
│   ├── event.test.js
│   ├── middleware/
│   ├── registration/
│   ├── services/
│   └── helpers/
│
├── server.js
├── package.json
├── .env.example
└── README.md
```

### Request Flow

``` text
Client
  ↓
Route
  ↓
Authentication / Authorization Middleware
  ↓
Controller
  ↓
Service / Model
  ↓
MongoDB
  ↓
Controller Response
```

------------------------------------------------------------------------

## User Roles

### Organizer

An organizer can:

-   Create events
-   Update their own events
-   Delete their own events
-   View registrations for their own events

### Attendee

An attendee can:

-   Register/login
-   View available events
-   Register for events
-   View their registrations
-   Cancel their own registrations

Authentication is handled using a JWT sent through the `Authorization`
header.

``` http
Authorization: Bearer <JWT_TOKEN>
```

------------------------------------------------------------------------

# API Endpoints

Base URL:

``` text
http://localhost:5000
```

## Authentication

### Register User

``` http
POST /register
```

Request:

``` json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "dateOfBirth": "1998-05-10",
  "role": "attendee"
}
```

Allowed roles:

``` text
organizer
attendee
```

Password must contain at least 8 characters.

Response:

``` json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "USER_ID",
    "name": "John Doe",
    "email": "john@example.com",
    "dateOfBirth": "1998-05-10T00:00:00.000Z",
    "role": "attendee"
  }
}
```

### Login

``` http
POST /login
```

Request:

``` json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:

``` json
{
  "success": true,
  "message": "Login successful",
  "token": "JWT_TOKEN"
}
```

The token expires after 1 hour.

------------------------------------------------------------------------

# Event APIs

## Create Event

Organizer only.

``` http
POST /events
Authorization: Bearer <ORGANIZER_TOKEN>
```

Example request:

``` json
{
  "title": "Backend Engineering Workshop",
  "description": "A practical backend development workshop.",
  "type": "workshop",
  "mode": "virtual",
  "date": "2026-12-20",
  "startTime": "10:00 AM",
  "endTime": "12:00 PM",
  "location": {
    "meetingLink": "https://example.com/meeting"
  },
  "eligibility": {
    "minAge": 18,
    "maxAge": 40
  },
  "registrationRules": {
    "maxParticipants": 100,
    "maxPeoplePerRegistration": 2,
    "registrationDeadline": "2026-12-18T23:59:59.000Z"
  },
  "requirements": {
    "thingsToBring": [
      "Laptop"
    ]
  },
  "rules": {
    "allowed": [
      "Active participation"
    ],
    "notAllowed": [
      "Sharing meeting credentials"
    ]
  },
  "termsAndConditions": [
    "Registration is subject to eligibility."
  ]
}
```

### Event Validation

The API validates:

-   Required event fields
-   Event date cannot be in the past
-   Start time must be before end time
-   Time must use `hh:mm AM/PM`
-   Meeting links must use HTTP/HTTPS
-   Minimum age cannot exceed maximum age
-   Maximum participants must be at least 1
-   Maximum people per registration must be at least 1
-   People per registration cannot exceed total capacity
-   Registration deadline must be before the event date

------------------------------------------------------------------------

## Get All Events

Public endpoint.

``` http
GET /events
```

Events are returned in ascending date order.

------------------------------------------------------------------------

## Get Event By ID

Public endpoint.

``` http
GET /events/:id
```

Invalid MongoDB ObjectIds are rejected with a `400` response instead of
producing a server error.

------------------------------------------------------------------------

## Update Event

Organizer only, and only for events owned by that organizer.

``` http
PUT /events/:id
Authorization: Bearer <ORGANIZER_TOKEN>
```

The API validates the final event state, including the existing values
for fields that were not included in the update request.

It also prevents reducing `maxParticipants` below the number of
currently registered participants.

------------------------------------------------------------------------

## Delete Event

Organizer only, and only for events owned by that organizer.

``` http
DELETE /events/:id
Authorization: Bearer <ORGANIZER_TOKEN>
```

When an event is deleted, its related registrations are deleted as well
to prevent orphaned registration records.

------------------------------------------------------------------------

# Registration APIs

## Register For Event

Authenticated users.

``` http
POST /events/:id/register
Authorization: Bearer <JWT_TOKEN>
```

Request:

``` json
{
  "attendees": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "dateOfBirth": "1998-05-10"
    },
    {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "dateOfBirth": "2000-08-15"
    }
  ]
}
```

### Registration Rules

Before creating a registration, the API checks:

1.  Event ID is valid
2.  Event exists
3.  Event is not cancelled
4.  Event is not completed
5.  Registration deadline has not passed
6.  Number of attendees does not exceed `maxPeoplePerRegistration`
7.  Registered user exists
8.  Attendee name/email/date of birth are valid
9.  Attendee age satisfies event eligibility
10. User has not already registered for the event
11. Event capacity is available

After successful registration, a confirmation email is attempted.

The API returns an `emailSent` flag so the client can distinguish
successful registration from email-delivery status.

Example response:

``` json
{
  "success": true,
  "message": "Registration successful",
  "emailSent": true,
  "registration": {}
}
```

------------------------------------------------------------------------

## Get My Registrations

Authenticated users.

``` http
GET /registrations
Authorization: Bearer <JWT_TOKEN>
```

Returns registrations created by the logged-in user.

------------------------------------------------------------------------

## Get Event Registrations

Organizer only.

``` http
GET /events/:eventId/registrations
Authorization: Bearer <ORGANIZER_TOKEN>
```

An organizer can only access registrations belonging to their own event.

------------------------------------------------------------------------

## Cancel Registration

The registration owner or the event organizer can cancel a registration.

``` http
DELETE /registrations/:id
Authorization: Bearer <JWT_TOKEN>
```

The registration is marked as:

``` text
cancelled
```

instead of being immediately removed.

A cancellation email is attempted after the status is updated.

------------------------------------------------------------------------

# Email Notifications

Nodemailer is used for email delivery.

Emails are sent for:

-   Successful registration
-   Registration cancellation

The registration itself is not rolled back if email delivery fails.

Instead, the API returns:

``` json
{
  "emailSent": false
}
```

This separates the core registration operation from the external email
service.

------------------------------------------------------------------------

# Environment Variables

Create a `.env` file in the project root.

``` env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_jwt_secret
EMAIL_USER=your_email_address
EMAIL_PASSWORD=your_gmail_app_password
```

For Gmail, use an **App Password** rather than your normal Gmail
password when SMTP authentication requires it.

Never commit the real `.env` file or credentials to Git.

A template is provided in:

``` text
.env.example
```

------------------------------------------------------------------------

# Installation

## 1. Clone the repository

``` bash
git clone <your-repository-url>
cd event-management-api
```

## 2. Install dependencies

``` bash
npm install
```

## 3. Configure environment variables

Create `.env`:

``` bash
cp .env.example .env
```

On Windows, you can create the `.env` file manually and copy the values
from `.env.example`.

Update the MongoDB, JWT, and email configuration.

## 4. Start the application

Production-style start:

``` bash
npm start
```

Development mode:

``` bash
npm run dev
```

The server runs on:

``` text
http://localhost:5000
```

------------------------------------------------------------------------

# Testing

The project uses:

-   Jest
-   Supertest

Run the test suite with:

``` bash
npm test
```
------------------------------------------------------------------------

# Example API Flow

A typical attendee flow looks like:

``` text
1. Register
   POST /register
        ↓
2. Login
   POST /login
        ↓
3. Receive JWT
        ↓
4. View events
   GET /events
        ↓
5. Register for event
   POST /events/:id/register
        ↓
6. Registration validation
        ↓
7. Save registration
        ↓
8. Send confirmation email
        ↓
9. View registrations
   GET /registrations
        ↓
10. Cancel if required
    DELETE /registrations/:id
```

Organizer flow:

``` text
1. Register as organizer
        ↓
2. Login
        ↓
3. Create event
        ↓
4. Update event
        ↓
5. View event registrations
        ↓
6. Manage/cancel event or registrations
        ↓
7. Delete event
        ↓
8. Related registrations are cleaned up
```
------------------------------------------------------------------------

# Author

**Gunjan Dixit**
