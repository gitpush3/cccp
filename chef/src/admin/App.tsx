import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/clerk-react";
import { 
  DollarSign, 
  Users, 
  Plane, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Building2,
  TrendingUp,
  X,
  RefreshCw,
  Copy,
  Ban,
  Link,
  Shield,
  Trash2
} from "lucide-react";

export default function AdminApp() {
  const { isSignedIn, isLoaded, user } = useUser();
  const isAdmin = useQuery(api.users.isCurrentUserAdmin);

  if (!isLoaded || isAdmin === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-brand-cyan/20 border-t-brand-cyan"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)' }}>
        <div className="glass-card p-10 text-center max-w-md">
          <div className="relative mx-auto w-fit mb-6">
            <div className="absolute inset-0 bg-brand-cyan/30 blur-2xl rounded-full"></div>
            <Plane className="h-16 w-16 text-brand-cyan relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-brand mb-3">LatitudeGo Admin</h1>
          <p className="text-gray-400 mb-8">Sign in to access the admin dashboard</p>
          <SignInButton mode="modal">
            <button className="btn-brand w-full text-lg">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)' }}>
        <div className="glass-card p-10 text-center max-w-md">
          <div className="relative mx-auto w-fit mb-6">
            <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full"></div>
            <Shield className="h-16 w-16 text-red-400 relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-gray-400 mb-4">You don't have admin privileges.</p>
          <p className="text-gray-500 text-sm mb-8">
            Signed in as: {user?.primaryEmailAddress?.emailAddress}
          </p>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)' }}>
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-brand-cyan/10" style={{ background: 'rgba(15, 15, 26, 0.85)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-purple/20 blur-xl rounded-full"></div>
                <Plane className="h-10 w-10 text-brand-purple relative z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient-brand">LatitudeGo Admin</h1>
                <p className="text-xs text-gray-400 tracking-wider uppercase">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">{user?.primaryEmailAddress?.emailAddress}</span>
              <div className="h-10 w-10 rounded-full ring-2 ring-brand-purple/30 ring-offset-2 ring-offset-transparent overflow-hidden">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <FinancialOverview />
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RevenueByTrip />
          <RevenueByAgent />
        </div>
        <div className="mt-8">
          <BookingsTable />
        </div>
        <div className="mt-8">
          <AgentsTable />
        </div>
        <div className="mt-8">
          <AdminsTable currentUserEmail={user?.primaryEmailAddress?.emailAddress || ""} />
        </div>
      </main>
    </div>
  );
}

function FinancialOverview() {
  const overview = useQuery(api.admin.getFinancialOverview);

  if (!overview) {
    return (
      <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card h-32" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Total Committed",
      value: `$${overview.totalCommitted.toLocaleString()}`,
      icon: DollarSign,
      color: "text-brand-cyan",
      bgColor: "bg-brand-cyan/10",
      hoverShadow: "hover:shadow-glow-cyan",
    },
    {
      label: "Total Paid",
      value: `$${overview.totalPaid.toLocaleString()}`,
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
      hoverShadow: "hover:shadow-[0_0_20px_rgba(74,222,128,0.3)]",
    },
    {
      label: "Outstanding",
      value: `$${overview.totalOutstanding.toLocaleString()}`,
      icon: Clock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
      hoverShadow: "hover:shadow-[0_0_20px_rgba(250,204,21,0.3)]",
    },
    {
      label: "Failed Payments",
      value: overview.failedInstallmentsCount.toString(),
      icon: AlertTriangle,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
      hoverShadow: "hover:shadow-[0_0_20px_rgba(248,113,113,0.3)]",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
        <span className="w-1 h-6 bg-gradient-to-b from-brand-cyan to-brand-purple rounded-full"></span>
        Financial Overview
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className={`glass-card p-6 group transition-all duration-300 ${stat.hoverShadow}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <div className="glass-card p-5">
          <p className="text-gray-500 text-sm uppercase tracking-wider">Total Bookings</p>
          <p className="text-2xl font-bold text-white mt-1">{overview.totalBookings}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-gray-500 text-sm uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-brand-cyan mt-1">{overview.activeBookings}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-gray-500 text-sm uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{overview.completedBookings}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-gray-500 text-sm uppercase tracking-wider">Overdue</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{overview.overdueBookings}</p>
        </div>
      </div>
    </div>
  );
}

function RevenueByTrip() {
  const data = useQuery(api.admin.getRevenueByTrip);

  if (!data) {
    return <div className="glass-card h-64 animate-pulse" />;
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center space-x-3 mb-5">
        <div className="p-2 rounded-lg bg-brand-cyan/10">
          <Plane className="h-5 w-5 text-brand-cyan" />
        </div>
        <h3 className="text-xl font-semibold text-white">Revenue by Trip</h3>
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {data.map((trip: any) => (
          <div key={trip.tripId} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-brand-cyan/20 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-white font-semibold">{trip.tripName}</h4>
                <p className="text-gray-500 text-sm">{trip.travelDate} • {trip.bookingsCount} bookings</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Committed</p>
                <p className="text-white font-semibold">${trip.totalCommitted.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Paid</p>
                <p className="text-green-400 font-semibold">${trip.totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Outstanding</p>
                <p className="text-yellow-400 font-semibold">${trip.totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-gray-500 text-center py-8">No trips found</p>
        )}
      </div>
    </div>
  );
}

function RevenueByAgent() {
  const data = useQuery(api.admin.getRevenueByAgent);

  if (!data) {
    return <div className="glass-card h-64 animate-pulse" />;
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center space-x-3 mb-5">
        <div className="p-2 rounded-lg bg-brand-purple/10">
          <Building2 className="h-5 w-5 text-brand-purple" />
        </div>
        <h3 className="text-xl font-semibold text-white">Revenue by Agent</h3>
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {data.map((agent: any) => (
          <div key={agent.agentId} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-brand-purple/20 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-white font-semibold">{agent.agentName}</h4>
                <p className="text-gray-500 text-sm">{agent.agencyName} • {agent.referralCode}</p>
              </div>
              <span className="text-xs bg-brand-purple/20 text-brand-purple px-2.5 py-1 rounded-full font-medium">
                {agent.commissionRate}% commission
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Bookings</p>
                <p className="text-white font-semibold">{agent.bookingsCount}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Total Paid</p>
                <p className="text-green-400 font-semibold">${agent.totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Commission</p>
                <p className="text-brand-purple font-semibold">${agent.commissionEarned.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-gray-500 text-center py-8">No agents found</p>
        )}
      </div>
    </div>
  );
}

function BookingsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const pageSize = 10;

  const result = useQuery(api.admin.getBookingsPaginated, {
    page,
    pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-brand-cyan/10">
            <CreditCard className="h-5 w-5 text-brand-cyan" />
          </div>
          <h3 className="text-xl font-semibold text-white">All Bookings</h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-brand-cyan outline-none transition-all"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {!result ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="pb-4 font-medium">Customer</th>
                  <th className="pb-4 font-medium">Trip</th>
                  <th className="pb-4 font-medium">Agent</th>
                  <th className="pb-4 font-medium">Amount</th>
                  <th className="pb-4 font-medium">Paid</th>
                  <th className="pb-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {result.bookings.map((booking: any) => (
                  <tr key={booking._id} className="text-sm hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div>
                        <p className="text-white font-medium">{booking.user?.name || "Unknown"}</p>
                        <p className="text-gray-500 text-xs">{booking.user?.email}</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <p className="text-white">{booking.trip?.tripName || booking.tripId}</p>
                      <p className="text-gray-500 text-xs">{booking.package} • {booking.occupancy} pax</p>
                    </td>
                    <td className="py-4">
                      {booking.agent ? (
                        <div>
                          <p className="text-white">{booking.agent.name}</p>
                          <p className="text-gray-500 text-xs">{booking.referralCode}</p>
                        </div>
                      ) : (
                        <span className="text-gray-600">Direct</span>
                      )}
                    </td>
                    <td className="py-4 text-white font-medium">${booking.totalAmount.toLocaleString()}</td>
                    <td className="py-4 text-green-400 font-medium">${booking.amountPaid.toLocaleString()}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        booking.status === "active" ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30" :
                        booking.status === "completed" ? "bg-green-400/20 text-green-400 border border-green-400/30" :
                        booking.status === "overdue" ? "bg-red-400/20 text-red-400 border border-red-400/30" :
                        "bg-gray-400/20 text-gray-400 border border-gray-400/30"
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
            <p className="text-gray-500 text-sm">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, result.totalCount)} of {result.totalCount}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white px-4">Page {page} of {result.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
                disabled={page === result.totalPages}
                className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AgentsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const pageSize = 10;

  const result = useQuery(api.admin.getAgentsPaginated, {
    page,
    pageSize,
    search: search || undefined,
  });

  const createAgent = useMutation(api.agents.createAgent);
  const deactivateAgent = useMutation(api.agents.deactivateAgent);
  const regenerateCode = useMutation(api.agents.regenerateReferralCode);

  const handleCopyReferralLink = (referralCode: string) => {
    const link = `https://latitudego.com/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(referralCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-brand-purple/10">
            <Users className="h-5 w-5 text-brand-purple" />
          </div>
          <h3 className="text-xl font-semibold text-white">Travel Agents</h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/20 outline-none transition-all"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-brand px-4 py-2.5 flex items-center space-x-2 text-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Agent</span>
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          onSubmit={async (data) => {
            await createAgent(data);
            setShowAddModal(false);
          }}
        />
      )}

      {!result ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="pb-4 font-medium">Agent</th>
                  <th className="pb-4 font-medium">Agency</th>
                  <th className="pb-4 font-medium">Referral Code</th>
                  <th className="pb-4 font-medium">Bookings</th>
                  <th className="pb-4 font-medium">Total Committed</th>
                  <th className="pb-4 font-medium">Outstanding</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {result.agents.map((agent: any) => (
                  <tr key={agent._id} className="text-sm hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div>
                        <p className="text-white font-medium">{agent.name}</p>
                        <p className="text-gray-500 text-xs">{agent.email}</p>
                      </div>
                    </td>
                    <td className="py-4 text-white">{agent.agencyName}</td>
                    <td className="py-4">
                      <div className="flex items-center space-x-2">
                        <code className="bg-brand-purple/10 px-2.5 py-1 rounded-lg text-brand-purple text-xs font-medium">
                          {agent.referralCode}
                        </code>
                        <button
                          onClick={() => handleCopyReferralLink(agent.referralCode)}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          title="Copy referral link"
                        >
                          {copiedCode === agent.referralCode ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 text-white font-medium">{agent.stats.totalBookings}</td>
                    <td className="py-4 text-white font-medium">${agent.stats.totalCommitted.toLocaleString()}</td>
                    <td className="py-4 text-yellow-400 font-medium">${agent.stats.totalOutstanding.toLocaleString()}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        agent.isActive ? "bg-green-400/20 text-green-400 border border-green-400/30" : "bg-gray-400/20 text-gray-400 border border-gray-400/30"
                      }`}>
                        {agent.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => regenerateCode({ agentId: agent._id })}
                          className="p-2 rounded-lg hover:bg-brand-cyan/10 text-gray-400 hover:text-brand-cyan transition-all"
                          title="Regenerate code"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        {agent.isActive && (
                          <button
                            onClick={() => deactivateAgent({ agentId: agent._id })}
                            className="p-2 rounded-lg hover:bg-red-400/10 text-gray-400 hover:text-red-400 transition-all"
                            title="Deactivate agent"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
            <p className="text-gray-500 text-sm">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, result.totalCount)} of {result.totalCount}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white px-4">Page {page} of {result.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
                disabled={page === result.totalPages}
                className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface AddAgentModalProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    agencyName: string;
    phone?: string;
    commissionRate?: number;
  }) => Promise<void>;
}

function AddAgentModal({ onClose, onSubmit }: AddAgentModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [commissionRate, setCommissionRate] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        email,
        agencyName,
        phone: phone || undefined,
        commissionRate: parseFloat(commissionRate) || 10,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Add New Agent</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Agency Name *</label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Commission Rate (%)</label>
            <input
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              min="0"
              max="100"
              step="0.5"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 border border-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-brand py-3 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AdminsTableProps {
  currentUserEmail: string;
}

function AdminsTable({ currentUserEmail }: AdminsTableProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const admins = useQuery(api.users.listAdmins);
  const addAdmin = useMutation(api.users.addAdmin);
  const removeAdmin = useMutation(api.users.removeAdmin);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    
    setIsAdding(true);
    try {
      await addAdmin({ email: newAdminEmail.trim().toLowerCase() });
      setNewAdminEmail("");
      setShowAddModal(false);
    } catch (error: any) {
      alert(error.message || "Failed to add admin");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!confirm(`Remove admin privileges from ${email}?`)) return;
    
    try {
      await removeAdmin({ email });
    } catch (error: any) {
      alert(error.message || "Failed to remove admin");
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-red-400/10">
            <Shield className="h-5 w-5 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Admin Users</h3>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-brand px-4 py-2.5 flex items-center space-x-2 text-sm"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Admin</span>
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Add New Admin</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAdmin} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-2 uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@latitudego.com"
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all"
                />
              </div>
              <p className="text-gray-500 text-sm">
                The user will gain admin access when they sign in with this email.
              </p>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 border border-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 btn-brand py-3 disabled:opacity-50"
                >
                  {isAdding ? "Adding..." : "Add Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!admins ? (
        <div className="animate-pulse space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No admins found</p>
      ) : (
        <div className="space-y-3">
          {admins.map((admin: any) => (
            <div key={admin._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 rounded-xl bg-brand-purple/10">
                  <Shield className="h-5 w-5 text-brand-purple" />
                </div>
                <div>
                  <p className="text-white font-medium">{admin.email}</p>
                  {admin.name && <p className="text-gray-500 text-sm">{admin.name}</p>}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {admin.email === currentUserEmail ? (
                  <span className="text-xs bg-brand-cyan/20 text-brand-cyan px-2.5 py-1 rounded-full font-medium">
                    You
                  </span>
                ) : (
                  <button
                    onClick={() => handleRemoveAdmin(admin.email)}
                    className="p-2 rounded-lg hover:bg-red-400/10 text-gray-400 hover:text-red-400 transition-all"
                    title="Remove admin"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
