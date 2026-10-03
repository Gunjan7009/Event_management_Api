const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const escapeHtml = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const sendRegistrationEmail = async (registration, event, options = {}) => {
  const recipientList = registration.attendees.map(
    (attendee) => attendee.email,
  );

  if (options.registrantEmail) {
    recipientList.push(options.registrantEmail);
  }

  const recipients = [...new Set(recipientList)].join(",");

  const attendeeHtml = registration.attendees
    .map(
      (attendee) => `
        <li>
          <strong>${escapeHtml(attendee.name)}</strong> - ${escapeHtml(attendee.email)}
        </li>
      `,
    )
    .join("");

  const attendeeText = registration.attendees
    .map(
      (attendee, index) => `${index + 1}. ${attendee.name} - ${attendee.email}`,
    )
    .join("\n");

  const formattedDate = formatDate(event.date);

  const organizerName = event.organizerId?.name || "Event Organizer";

  let locationHtml = "";
  let locationText = "";

  if (event.mode === "virtual") {
    locationHtml = `
      <div style="
        text-align: center;
        background: #f0f7ff;
        padding: 20px;
        border-radius: 8px;
        margin-top: 20px;
      ">
        <h3>💻 Join the Event</h3>

        <p>
          Please join the meeting
          <strong>15 minutes before</strong>
          the event starts.
        </p>

        <a
          href="${escapeHtml(event.location?.meetingLink)}"
          style="
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
          "
        >
          Join Event
        </a>
      </div>
    `;

    locationText = `
Meeting Link: ${event.location?.meetingLink}

Please join the meeting 15 minutes before the event starts.
`;
  } else {
    locationHtml = `
      <div style="
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-top: 20px;
      ">
        <h3>📍 Event Location</h3>

        <p>
          <strong>Venue:</strong>
          ${escapeHtml(event.location?.venue) || "Not provided"}
        </p>

        <p>
          <strong>Address:</strong>
          ${escapeHtml(event.location?.address) || "Not provided"}
        </p>

        <p>
          Please arrive
          <strong>15 minutes before</strong>
          the event starts.
        </p>
      </div>
    `;

    locationText = `
Venue: ${event.location?.venue || "Not provided"}
Address: ${event.location?.address || "Not provided"}

Please arrive 15 minutes before the event starts.
`;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipients,
    subject: `Registration confirmed - ${event.title}`,

    text: `
Registration Confirmed 🎉

Your registration for "${event.title}" has been confirmed.

Date: ${formattedDate}
Time: ${event.startTime} - ${event.endTime}
Organizer: ${organizerName}
Mode: ${event.mode}
Number of People: ${registration.numberOfPeople}

${locationText}

Attendees:
${attendeeText}

Registration ID: ${registration._id}

Thank you for registering!
`,

    html: `
      <div style="
        background: #f4f6f8;
        padding: 30px 15px;
        font-family: Arial, sans-serif;
      ">

        <div style="
          max-width: 600px;
          margin: auto;
          background: white;
          border-radius: 10px;
          overflow: hidden;
        ">

          <div style="
            background: #2563eb;
            color: white;
            text-align: center;
            padding: 25px;
          ">
            <h2>🎉 Registration Confirmed</h2>
          </div>

          <div style="padding: 25px;">

            <p style="text-align: center;">
              Your registration for
              <strong>${escapeHtml(event.title)}</strong>
              has been confirmed.
            </p>

            <div style="
              background: #f8f9fa;
              padding: 18px;
              border-radius: 8px;
              margin-top: 20px;
            ">

              <h3>📅 Event Details</h3>

              <p>
                <strong>Date:</strong>
                ${formattedDate}
              </p>

              <p>
                <strong>Time:</strong>
                ${event.startTime} - ${event.endTime}
              </p>

              <p>
                <strong>Organizer:</strong>
                ${escapeHtml(organizerName)}
              </p>

              <p>
                <strong>Mode:</strong>
                ${event.mode}
              </p>

              <p>
                <strong>Number of People:</strong>
                ${registration.numberOfPeople}
              </p>

            </div>

            ${locationHtml}

            <div style="margin-top: 20px;">
              <h3>👥 Attendees</h3>

              <ul>
                ${attendeeHtml}
              </ul>
            </div>

            <div style="
              text-align: center;
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-top: 20px;
            ">
              <strong>Registration ID</strong>

              <p style="word-break: break-all;">
                ${registration._id}
              </p>
            </div>

            <p style="
              text-align: center;
              margin-top: 25px;
            ">
              Thank you for registering! 🎉
            </p>

          </div>

          <div style="
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            font-size: 12px;
            color: #777;
          ">
            This is an automated email.
          </div>

        </div>

      </div>
    `,
  });
};

const sendCancellationEmail = async (registration, event) => {
  const recipients = registration.attendees
    .map((attendee) => attendee.email)
    .join(",");

  const formattedDate = formatDate(event.date);

  const organizerName = event.organizerId?.name || "Event Organizer";

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipients,
    subject: `Registration cancelled - ${event.title}`,

    text: `
Registration Cancelled

Your registration for "${event.title}" has been cancelled.

Date: ${formattedDate}
Time: ${event.startTime} - ${event.endTime}
Organizer: ${organizerName}

Registration ID: ${registration._id}

If you did not request this cancellation, please contact the organizer.
`,

    html: `
      <div style="
        background: #f4f6f8;
        padding: 30px 15px;
        font-family: Arial, sans-serif;
      ">

        <div style="
          max-width: 600px;
          margin: auto;
          background: white;
          border-radius: 10px;
          overflow: hidden;
        ">

          <div style="
            background: #dc2626;
            color: white;
            text-align: center;
            padding: 25px;
          ">
            <h2>❌ Registration Cancelled</h2>
          </div>

          <div style="
            padding: 25px;
            text-align: center;
          ">

            <p>
              Your registration for
              <strong>${escapeHtml(event.title)}</strong>
              has been cancelled.
            </p>

            <p>
              <strong>Date:</strong> ${formattedDate}
            </p>

            <p>
              <strong>Time:</strong>
              ${event.startTime} - ${event.endTime}
            </p>

            <p>
              <strong>Organizer:</strong>
              ${escapeHtml(organizerName)}
            </p>

            <p>
              <strong>Registration ID:</strong><br>
              ${registration._id}
            </p>

            <p style="margin-top: 25px;">
              If you did not request this cancellation,
              please contact the organizer.
            </p>

          </div>

        </div>

      </div>
    `,
  });
};

module.exports = {
  sendRegistrationEmail,
  sendCancellationEmail,
};
