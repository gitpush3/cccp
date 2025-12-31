/**
 * SendGrid Email Helper
 */

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "bookings@latitudego.com";

  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not set, skipping email.");
    return;
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: "LatitudeGo Bookings" },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("SendGrid error:", error);
    throw new Error(`Failed to send email: ${error}`);
  }

  console.log(`Email sent to ${to}: ${subject}`);
};
