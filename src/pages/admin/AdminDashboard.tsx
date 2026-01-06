import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Users, Calendar, DollarSign, TrendingUp, Package, 
  CreditCard, Search, Filter, ChevronDown, Eye,
  CheckCircle, Clock, AlertCircle, XCircle
} from "lucide-react";

export default function AdminDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const stats = useQuery(api.admin.getDashboardStats);
  const allBookings = useQuery(api.admin.getAllBookings);
  const allUsers = useQuery(api.admin.getAllUsers);
  const pendingPayments = useQuery(api.admin.getPendingPayments);

  const [activeTab, setActiveTab] = useState<"overview" | "bookings" | "users" | "payments">("overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Check if user is admin (you'd want to add an isAdmin field to users schema)
  const isAdmin = user?.email?.includes("@latitudego.com") || user?.email?.includes("@3bids.io");

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-dark flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-dark">
      {/* Header */}
      <div className="bg-primary text-white py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-white/70 text-sm">God Mode - Full System Visibility</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 -mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<DollarSign className="h-6 w-6" />}
              label="Total Revenue"
              value={`$${((stats.totalRevenue || 0) / 100).toLocaleString()}`}
              color="bg-green-500"
            />
            <StatCard
              icon={<Calendar className="h-6 w-6" />}
              label="Total Bookings"
              value={stats.totalBookings || 0}
              color="bg-blue-500"
            />
            <StatCard
              icon={<Users className="h-6 w-6" />}
              label="Total Users"
              value={stats.totalUsers || 0}
              color="bg-purple-500"
            />
            <StatCard
              icon={<CreditCard className="h-6 w-6" />}
              label="Pending Payments"
              value={stats.pendingPayments || 0}
              color="bg-orange-500"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
          {[
            { id: "overview", label: "Overview" },
            { id: "bookings", label: "All Bookings" },
            { id: "users", label: "Users" },
            { id: "payments", label: "Payments" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "overview" && (
          <OverviewTab stats={stats} recentBookings={allBookings?.slice(0, 5)} />
        )}
        {activeTab === "bookings" && (
          <BookingsTab bookings={allBookings} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        )}
        {activeTab === "users" && (
          <UsersTab users={allUsers} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        )}
        {activeTab === "payments" && (
          <PaymentsTab payments={pendingPayments} />
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ stats, recentBookings }: { stats: any; recentBookings: any[] | undefined }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Revenue Chart Placeholder */}
      <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Revenue Overview</h3>
        <div className="h-48 flex items-center justify-center text-gray-400">
          <TrendingUp className="h-12 w-12" />
          <span className="ml-2">Chart coming soon</span>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Recent Bookings</h3>
        <div className="space-y-3">
          {recentBookings?.map((booking: any) => (
            <div key={booking._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {booking.metadata?.firstName} {booking.metadata?.lastName}
                </p>
                <p className="text-xs text-gray-500">{booking.trip?.title}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white text-sm">
                  ${(booking.totalAmount / 100).toLocaleString()}
                </p>
                <StatusBadge status={booking.status} />
              </div>
            </div>
          ))}
          {(!recentBookings || recentBookings.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-4">No bookings yet</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 lg:col-span-2">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Booking Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Pending Deposit", count: stats?.statusCounts?.pending_deposit || 0, color: "text-yellow-500" },
            { label: "Confirmed", count: stats?.statusCounts?.confirmed || 0, color: "text-blue-500" },
            { label: "Fully Paid", count: stats?.statusCounts?.fully_paid || 0, color: "text-green-500" },
            { label: "Cancelled", count: stats?.statusCounts?.cancelled || 0, color: "text-red-500" },
            { label: "Refunded", count: stats?.statusCounts?.refunded || 0, color: "text-gray-500" },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 bg-gray-50 dark:bg-dark rounded-lg">
              <p className={`text-3xl font-bold ${item.color}`}>{item.count}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingsTab({ bookings, searchTerm, setSearchTerm }: { bookings: any[] | undefined; searchTerm: string; setSearchTerm: (s: string) => void }) {
  const filteredBookings = bookings?.filter((b: any) => {
    const search = searchTerm.toLowerCase();
    return (
      b.metadata?.firstName?.toLowerCase().includes(search) ||
      b.metadata?.lastName?.toLowerCase().includes(search) ||
      b.metadata?.email?.toLowerCase().includes(search) ||
      b.trip?.title?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      {/* Search */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or trip..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-surface focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trip</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Package</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Advisor</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredBookings?.map((booking: any) => (
                <tr key={booking._id} className="hover:bg-gray-50 dark:hover:bg-dark transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {booking.metadata?.firstName} {booking.metadata?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{booking.metadata?.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                    {booking.trip?.title || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {booking.package?.title || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-900 dark:text-white">
                    ${(booking.totalAmount / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                    ${(booking.depositPaid / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {booking.advisor?.name || booking.advisor?.email || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-dark rounded-lg transition-colors">
                      <Eye className="h-4 w-4 text-gray-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!filteredBookings || filteredBookings.length === 0) && (
          <div className="p-8 text-center text-gray-500">No bookings found</div>
        )}
      </div>
    </div>
  );
}

function UsersTab({ users, searchTerm, setSearchTerm }: { users: any[] | undefined; searchTerm: string; setSearchTerm: (s: string) => void }) {
  const filteredUsers = users?.filter((u: any) => {
    const search = searchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search) ||
      u.referralCode?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-surface focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Referral Code</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Referred By</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Referral Earnings</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Stripe Account</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Subscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredUsers?.map((user: any) => (
                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-dark transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {user.picture ? (
                        <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-primary font-bold text-sm">
                            {user.name?.[0] || user.email?.[0] || "?"}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{user.name || "—"}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-dark rounded text-sm font-mono">
                      {user.referralCode || "—"}
                    </code>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {user.referredBy || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-green-600">
                    ${((user.totalReferralEarnings || 0) / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-4">
                    {user.stripeAccountId ? (
                      <span className="text-green-600 text-sm">Connected</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Not connected</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      user.subscriptionStatus === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {user.subscriptionStatus || "none"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PaymentsTab({ payments }: { payments: any[] | undefined }) {
  return (
    <div>
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white">Pending Installments</h3>
          <p className="text-sm text-gray-500">Upcoming payments that need attention</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trip</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {payments?.map((payment: any) => {
                const isOverdue = new Date(payment.dueDate) < new Date();
                return (
                  <tr key={payment._id} className="hover:bg-gray-50 dark:hover:bg-dark transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {payment.booking?.metadata?.firstName} {payment.booking?.metadata?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{payment.booking?.metadata?.email}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {payment.booking?.trip?.title || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      ${(payment.amount / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm ${isOverdue ? "text-red-600 font-bold" : "text-gray-600 dark:text-gray-400"}`}>
                        {new Date(payment.dueDate).toLocaleDateString()}
                        {isOverdue && " (Overdue)"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        payment.status === "pending"
                          ? isOverdue
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {isOverdue ? "Overdue" : payment.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!payments || payments.length === 0) && (
          <div className="p-8 text-center text-gray-500">No pending payments</div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; icon: React.ReactNode }> = {
    pending_deposit: { bg: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
    confirmed: { bg: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-3 w-3" /> },
    fully_paid: { bg: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
    cancelled: { bg: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
    refunded: { bg: "bg-gray-100 text-gray-800", icon: <AlertCircle className="h-3 w-3" /> },
  };

  const { bg, icon } = config[status] || config.confirmed;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${bg}`}>
      {icon}
      {status.replace("_", " ")}
    </span>
  );
}
