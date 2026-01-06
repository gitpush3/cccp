import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process due installments every day at 6:00 AM EST (11:00 AM UTC)
crons.daily(
  "process-due-installments",
  { hourUTC: 11, minuteUTC: 0 },
  internal.payments.processDueInstallments
);

export default crons;
