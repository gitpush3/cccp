"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Internal action to send email notification
export const sendFormEmail = internalAction({
  args: {
    submissionId: v.id("formSubmissions"),
  },
  handler: async (ctx, args) => {
    // Get the submission
    const submission = await ctx.runQuery(internal.formSubmissions.getSubmission, {
      submissionId: args.submissionId,
    });

    if (!submission) {
      console.error("Submission not found:", args.submissionId);
      return;
    }

    // Format email content
    const emailContent = `
New Form Submission - Alternative to Payment

Email: ${submission.email}
Job Type: ${submission.jobType}
Use Case / Features Needed:
${submission.useCase}

Submitted At: ${new Date(submission.submittedAt).toISOString()}
${submission.clerkId ? `User ID: ${submission.clerkId}` : "Anonymous user"}
Status: Access automatically granted - unlimited messages enabled
`;

    // Get admin email from environment variable
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_TO;
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || "noreply@code.3bids.io";
    
    if (adminEmail && sendGridApiKey) {
      try {
        // Dynamic import for SendGrid
        const sgMail = await import("@sendgrid/mail");
        sgMail.default.setApiKey(sendGridApiKey);
        
        const msg = {
          to: adminEmail,
          from: emailFrom, // Must be a verified sender in SendGrid
          subject: "New Form Submission - Alternative to Payment",
          text: emailContent,
          html: `
            <h2>New Form Submission - Alternative to Payment</h2>
            <p><strong>Email:</strong> ${submission.email}</p>
            <p><strong>Job Type:</strong> ${submission.jobType}</p>
            <p><strong>Use Case / Features Needed:</strong></p>
            <p>${submission.useCase.replace(/\n/g, '<br>')}</p>
            <p><strong>Submitted At:</strong> ${new Date(submission.submittedAt).toLocaleString()}</p>
            <p><strong>User ID:</strong> ${submission.clerkId || "Anonymous user"}</p>
            <p><strong>Status:</strong> Access automatically granted - unlimited messages enabled</p>
          `,
        };
        
        await sgMail.default.send(msg);
        console.log("Email sent successfully via SendGrid to:", adminEmail);
      } catch (error: any) {
        console.error("Error sending email via SendGrid:", error);
        if (error.response) {
          console.error("SendGrid error details:", error.response.body);
        }
        // Fall through to console log as backup
        console.log("=== FORM SUBMISSION EMAIL (SendGrid failed, logging instead) ===");
        console.log(`To: ${adminEmail}`);
        console.log(`Subject: New Form Submission - Alternative to Payment`);
        console.log(emailContent);
        console.log("================================================================");
      }
    } else if (adminEmail) {
      // Log email content if SendGrid API key is not configured
      console.log("=== FORM SUBMISSION EMAIL (SendGrid not configured) ===");
      console.log(`To: ${adminEmail}`);
      console.log(`Subject: New Form Submission - Alternative to Payment`);
      console.log(emailContent);
      console.log("=========================================================");
      console.log("\nTo enable email sending, set SENDGRID_API_KEY in your Convex environment variables.");
      console.log("Also set EMAIL_FROM or SENDGRID_FROM_EMAIL to your verified sender email in SendGrid.");
    } else {
      // Log to console if no admin email is configured
      console.log("=== FORM SUBMISSION EMAIL (No admin email configured) ===");
      console.log(emailContent);
      console.log("=========================================================");
      console.log("\nTo receive email notifications, set ADMIN_EMAIL or EMAIL_TO in your Convex environment variables.");
    }

    // Mark as processed
    await ctx.runMutation(internal.formSubmissions.markAsProcessed, {
      submissionId: args.submissionId,
    });
  },
});
