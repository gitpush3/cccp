import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
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
  TrendingUp
} from "lucide-react";

export default function AdminApp() {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Plane className="h-8 w-8 text-cyan-400" />
              <div>
                <h1 className="text-xl font-bold text-white">LatitudeGo Admin</h1>
                <p className="text-xs text-gray-400">Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div key={i} className="bg-gray-800 rounded-xl h-32" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Total Committed",
      value: `$${overview.totalCommitted.toLocaleString()}`,
      icon: DollarSign,
      color: "text-cyan-400",
      bgColor: "bg-cyan-400/10",
    },
    {
      label: "Total Paid",
      value: `$${overview.totalPaid.toLocaleString()}`,
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
    },
    {
      label: "Outstanding",
      value: `$${overview.totalOutstanding.toLocaleString()}`,
      icon: Clock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
    },
    {
      label: "Failed Payments",
      value: overview.failedInstallmentsCount.toString(),
      icon: AlertTriangle,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Financial Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Bookings</p>
          <p className="text-xl font-bold text-white">{overview.totalBookings}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-xl font-bold text-cyan-400">{overview.activeBookings}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Completed</p>
          <p className="text-xl font-bold text-green-400">{overview.completedBookings}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Overdue</p>
          <p className="text-xl font-bold text-red-400">{overview.overdueBookings}</p>
        </div>
      </div>
    </div>
  );
}

function RevenueByTrip() {
  const data = useQuery(api.admin.getRevenueByTrip);

  if (!data) {
    return <div className="bg-gray-800 rounded-xl h-64 animate-pulse" />;
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Plane className="h-5 w-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Revenue by Trip</h3>
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {data.map((trip) => (
          <div key={trip.tripId} className="p-4 bg-gray-700/30 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-white font-medium">{trip.tripName}</h4>
                <p className="text-gray-400 text-sm">{trip.travelDate} • {trip.bookingsCount} bookings</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Committed</p>
                <p className="text-white font-medium">${trip.totalCommitted.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Paid</p>
                <p className="text-green-400 font-medium">${trip.totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Outstanding</p>
                <p className="text-yellow-400 font-medium">${trip.totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-gray-400 text-center py-8">No trips found</p>
        )}
      </div>
    </div>
  );
}

function RevenueByAgent() {
  const data = useQuery(api.admin.getRevenueByAgent);

  if (!data) {
    return <div className="bg-gray-800 rounded-xl h-64 animate-pulse" />;
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Building2 className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Revenue by Agent</h3>
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {data.map((agent) => (
          <div key={agent.agentId} className="p-4 bg-gray-700/30 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-white font-medium">{agent.agentName}</h4>
                <p className="text-gray-400 text-sm">{agent.agencyName} • {agent.referralCode}</p>
              </div>
              <span className="text-xs bg-purple-400/20 text-purple-400 px-2 py-1 rounded">
                {agent.commissionRate}% commission
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Bookings</p>
                <p className="text-white font-medium">{agent.bookingsCount}</p>
              </div>
              <div>
                <p className="text-gray-400">Total Paid</p>
                <p className="text-green-400 font-medium">${agent.totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Commission</p>
                <p className="text-purple-400 font-medium">${agent.commissionEarned.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-gray-400 text-center py-8">No agents found</p>
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
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">All Bookings</h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-cyan-400 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-cyan-400 outline-none"
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
            <div key={i} className="h-16 bg-gray-700 rounded" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Trip</th>
                  <th className="pb-3 font-medium">Agent</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Paid</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {result.bookings.map((booking: any) => (
                  <tr key={booking._id} className="text-sm">
                    <td className="py-4">
                      <div>
                        <p className="text-white font-medium">{booking.user?.name || "Unknown"}</p>
                        <p className="text-gray-400 text-xs">{booking.user?.email}</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <p className="text-white">{booking.trip?.tripName || booking.tripId}</p>
                      <p className="text-gray-400 text-xs">{booking.package} • {booking.occupancy} pax</p>
                    </td>
                    <td className="py-4">
                      {booking.agent ? (
                        <div>
                          <p className="text-white">{booking.agent.name}</p>
                          <p className="text-gray-400 text-xs">{booking.referralCode}</p>
                        </div>
                      ) : (
                        <span className="text-gray-500">Direct</span>
                      )}
                    </td>
                    <td className="py-4 text-white">${booking.totalAmount.toLocaleString()}</td>
                    <td className="py-4 text-green-400">${booking.amountPaid.toLocaleString()}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        booking.status === "active" ? "bg-cyan-400/20 text-cyan-400" :
                        booking.status === "completed" ? "bg-green-400/20 text-green-400" :
                        booking.status === "overdue" ? "bg-red-400/20 text-red-400" :
                        "bg-gray-400/20 text-gray-400"
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
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, result.totalCount)} of {result.totalCount}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded bg-gray-700 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white px-4">Page {page} of {result.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
                disabled={page === result.totalPages}
                className="p-2 rounded bg-gray-700 text-gray-400 hover:text-white disabled:opacity-50"
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
  const pageSize = 10;

  const result = useQuery(api.admin.getAgentsPaginated, {
    page,
    pageSize,
    search: search || undefined,
  });

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Travel Agents</h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-cyan-400 outline-none"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600">
            <UserPlus className="h-4 w-4" />
            <span>Add Agent</span>
          </button>
        </div>
      </div>

      {!result ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3 font-medium">Agent</th>
                  <th className="pb-3 font-medium">Agency</th>
                  <th className="pb-3 font-medium">Referral Code</th>
                  <th className="pb-3 font-medium">Bookings</th>
                  <th className="pb-3 font-medium">Total Committed</th>
                  <th className="pb-3 font-medium">Outstanding</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {result.agents.map((agent: any) => (
                  <tr key={agent._id} className="text-sm">
                    <td className="py-4">
                      <div>
                        <p className="text-white font-medium">{agent.name}</p>
                        <p className="text-gray-400 text-xs">{agent.email}</p>
                      </div>
                    </td>
                    <td className="py-4 text-white">{agent.agencyName}</td>
                    <td className="py-4">
                      <code className="bg-gray-700 px-2 py-1 rounded text-cyan-400 text-xs">
                        {agent.referralCode}
                      </code>
                    </td>
                    <td className="py-4 text-white">{agent.stats.totalBookings}</td>
                    <td className="py-4 text-white">${agent.stats.totalCommitted.toLocaleString()}</td>
                    <td className="py-4 text-yellow-400">${agent.stats.totalOutstanding.toLocaleString()}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        agent.isActive ? "bg-green-400/20 text-green-400" : "bg-gray-400/20 text-gray-400"
                      }`}>
                        {agent.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, result.totalCount)} of {result.totalCount}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded bg-gray-700 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white px-4">Page {page} of {result.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
                disabled={page === result.totalPages}
                className="p-2 rounded bg-gray-700 text-gray-400 hover:text-white disabled:opacity-50"
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
