import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Submit form as alternative to payment - automatically grants unlimited access
export const submitForm = mutation({
  args: {
    email: v.string(),
    jobType: v.string(),
    useCase: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Store the form submission
    const submissionId = await ctx.db.insert("formSubmissions", {
      email: args.email,
      jobType: args.jobType,
      useCase: args.useCase,
      submittedAt: Date.now(),
      clerkId: args.clerkId,
      status: "granted_access", // Mark as granted since we auto-grant access
    });

    // If user is logged in, grant them unlimited access immediately
    if (args.clerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
        .unique();

      if (user) {
        // Grant unlimited access by setting subscription status to active
        await ctx.db.patch(user._id, {
          subscriptionStatus: "active",
          // Set endsAt to undefined for lifetime access, or set a future date for time-limited access
          endsAt: undefined,
        });
      }
    }

    // Schedule email sending action (async, doesn't block)
    await ctx.scheduler.runAfter(0, internal.formSubmissionsActions.sendFormEmail, {
      submissionId,
    });

    return { success: true, submissionId, accessGranted: !!args.clerkId };
  },
});

// Internal query to get submission
export const getSubmission = internalQuery({
  args: {
    submissionId: v.id("formSubmissions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.submissionId);
  },
});

// Internal mutation to mark as processed
export const markAsProcessed = internalMutation({
  args: {
    submissionId: v.id("formSubmissions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      status: "processed",
    });
  },
});

// Grant access to user after form submission (for manual granting if needed)
export const grantAccess = mutation({
  args: {
    submissionId: v.id("formSubmissions"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    // Update submission status
    await ctx.db.patch(args.submissionId, {
      status: "granted_access",
    });

    // If user is logged in, grant them access
    const targetClerkId = args.clerkId || submission.clerkId;
    if (targetClerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", targetClerkId))
        .unique();

      if (user) {
        await ctx.db.patch(user._id, {
          subscriptionStatus: "active",
          endsAt: undefined,
        });
      }
    }

    return { success: true };
  },
});

