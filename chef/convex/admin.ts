import { query } from "./_generated/server";
import { v } from "convex/values";

// ============ ADMIN DASHBOARD QUERIES ============

// Master financial overview
export const getFinancialOverview = query({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").collect();
    const installments = await ctx.db.query("installments").collect();

    const totalCommitted = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalPaid = bookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const totalOutstanding = totalCommitted - totalPaid;

    const activeBookings = bookings.filter((b) => b.status === "active").length;
    const completedBookings = bookings.filter((b) => b.status === "completed").length;
    const overdueBookings = bookings.filter((b) => b.status === "overdue").length;

    const pendingInstallments = installments.filter((i) => i.status === "pending");
    const failedInstallments = installments.filter((i) => i.status === "failed");

    const upcomingPayments = pendingInstallments
      .filter((i) => new Date(i.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      totalCommitted,
      totalPaid,
      totalOutstanding,
      totalBookings: bookings.length,
      activeBookings,
      completedBookings,
      overdueBookings,
      pendingInstallmentsCount: pendingInstallments.length,
      failedInstallmentsCount: failedInstallments.length,
      upcomingPaymentsNext7Days: upcomingPayments,
    };
  },
});

// Paginated bookings list with search and filters
export const getBookingsPaginated = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    tripId: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    let bookingsQuery = ctx.db.query("bookings");

    // Get all bookings first (Convex doesn't support complex filtering in queries)
    let bookings = await bookingsQuery.collect();

    // Apply filters
    if (args.status) {
      bookings = bookings.filter((b) => b.status === args.status);
    }
    if (args.tripId) {
      bookings = bookings.filter((b) => b.tripId === args.tripId);
    }
    if (args.agentId) {
      bookings = bookings.filter((b) => b.agentId === args.agentId);
    }

    // Enrich with user, trip, and agent data for search
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const user = await ctx.db.get(booking.userId);
        const trip = await ctx.db
          .query("trips")
          .withIndex("by_trip_id", (q) => q.eq("tripId", booking.tripId))
          .unique();
        const agent = booking.agentId ? await ctx.db.get(booking.agentId) : null;
        return { ...booking, user, trip, agent };
      })
    );

    // Apply search filter
    let filteredBookings = enrichedBookings;
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filteredBookings = enrichedBookings.filter(
        (b) =>
          b.user?.name?.toLowerCase().includes(searchLower) ||
          b.user?.email?.toLowerCase().includes(searchLower) ||
          b.trip?.tripName?.toLowerCase().includes(searchLower) ||
          b.agent?.name?.toLowerCase().includes(searchLower) ||
          b.agent?.agencyName?.toLowerCase().includes(searchLower) ||
          b.referralCode?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by createdAt descending
    filteredBookings.sort((a, b) => b.createdAt - a.createdAt);

    // Paginate
    const totalCount = filteredBookings.length;
    const totalPages = Math.ceil(totalCount / args.pageSize);
    const startIndex = (args.page - 1) * args.pageSize;
    const paginatedBookings = filteredBookings.slice(startIndex, startIndex + args.pageSize);

    return {
      bookings: paginatedBookings,
      totalCount,
      totalPages,
      currentPage: args.page,
    };
  },
});

// Paginated agents list with search
export const getAgentsPaginated = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    search: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let agents = await ctx.db.query("agents").collect();

    // Apply active filter
    if (args.isActive !== undefined) {
      agents = agents.filter((a) => a.isActive === args.isActive);
    }

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      agents = agents.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.email.toLowerCase().includes(searchLower) ||
          a.agencyName.toLowerCase().includes(searchLower) ||
          a.referralCode.toLowerCase().includes(searchLower)
      );
    }

    // Get stats for each agent
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const bookings = await ctx.db
          .query("bookings")
          .filter((q) => q.eq(q.field("agentId"), agent._id))
          .collect();

        const totalCommitted = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
        const totalPaid = bookings.reduce((sum, b) => sum + b.amountPaid, 0);

        return {
          ...agent,
          stats: {
            totalBookings: bookings.length,
            totalCommitted,
            totalPaid,
            totalOutstanding: totalCommitted - totalPaid,
          },
        };
      })
    );

    // Sort by createdAt descending
    agentsWithStats.sort((a, b) => b.createdAt - a.createdAt);

    // Paginate
    const totalCount = agentsWithStats.length;
    const totalPages = Math.ceil(totalCount / args.pageSize);
    const startIndex = (args.page - 1) * args.pageSize;
    const paginatedAgents = agentsWithStats.slice(startIndex, startIndex + args.pageSize);

    return {
      agents: paginatedAgents,
      totalCount,
      totalPages,
      currentPage: args.page,
    };
  },
});

// Paginated installments list
export const getInstallmentsPaginated = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    status: v.optional(v.string()),
    bookingId: v.optional(v.id("bookings")),
  },
  handler: async (ctx, args) => {
    let installments = await ctx.db.query("installments").collect();

    // Apply filters
    if (args.status) {
      installments = installments.filter((i) => i.status === args.status);
    }
    if (args.bookingId) {
      installments = installments.filter((i) => i.bookingId === args.bookingId);
    }

    // Enrich with booking data
    const enrichedInstallments = await Promise.all(
      installments.map(async (installment) => {
        const booking = await ctx.db.get(installment.bookingId);
        const user = booking ? await ctx.db.get(booking.userId) : null;
        return { ...installment, booking, user };
      })
    );

    // Sort by dueDate ascending
    enrichedInstallments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Paginate
    const totalCount = enrichedInstallments.length;
    const totalPages = Math.ceil(totalCount / args.pageSize);
    const startIndex = (args.page - 1) * args.pageSize;
    const paginatedInstallments = enrichedInstallments.slice(startIndex, startIndex + args.pageSize);

    return {
      installments: paginatedInstallments,
      totalCount,
      totalPages,
      currentPage: args.page,
    };
  },
});

// Get all trips for filter dropdowns
export const getAllTripsForFilter = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("trips").collect();
  },
});

// Revenue by trip
export const getRevenueByTrip = query({
  args: {},
  handler: async (ctx) => {
    const trips = await ctx.db.query("trips").collect();
    const bookings = await ctx.db.query("bookings").collect();

    return trips.map((trip) => {
      const tripBookings = bookings.filter((b) => b.tripId === trip.tripId);
      const totalCommitted = tripBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const totalPaid = tripBookings.reduce((sum, b) => sum + b.amountPaid, 0);

      return {
        tripId: trip.tripId,
        tripName: trip.tripName,
        travelDate: trip.travelDate,
        bookingsCount: tripBookings.length,
        totalCommitted,
        totalPaid,
        totalOutstanding: totalCommitted - totalPaid,
      };
    });
  },
});

// Revenue by agent
export const getRevenueByAgent = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const bookings = await ctx.db.query("bookings").collect();

    return agents.map((agent) => {
      const agentBookings = bookings.filter((b) => b.agentId === agent._id);
      const totalCommitted = agentBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const totalPaid = agentBookings.reduce((sum, b) => sum + b.amountPaid, 0);
      const commission = totalPaid * ((agent.commissionRate || 10) / 100);

      return {
        agentId: agent._id,
        agentName: agent.name,
        agencyName: agent.agencyName,
        referralCode: agent.referralCode,
        bookingsCount: agentBookings.length,
        totalCommitted,
        totalPaid,
        totalOutstanding: totalCommitted - totalPaid,
        commissionRate: agent.commissionRate || 10,
        commissionEarned: commission,
      };
    });
  },
});
