import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "react-router-dom";
import { 
  Users, MessageSquare, BarChart3, Mail
} from "lucide-react";

export default function AdminDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const chatStats = useQuery(api.analytics.getChatStats);
  const feedbackSummary = useQuery(api.analytics.getFeedbackSummary);

  const isAdmin = user?.email?.includes("@3bids.io");

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
          <p className="text-white/70 text-sm">Cuyahoga Code Chat - System Overview</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<MessageSquare className="h-6 w-6" />}
            label="Total Messages"
            value={chatStats?.totalMessages?.toLocaleString() || "0"}
            color="bg-blue-500"
          />
          <StatCard
            icon={<Users className="h-6 w-6" />}
            label="Total Chats"
            value={chatStats?.totalChats?.toLocaleString() || "0"}
            color="bg-purple-500"
          />
          <StatCard
            icon={<BarChart3 className="h-6 w-6" />}
            label="Last 24h"
            value={`${chatStats?.chatsLast24h || 0} chats`}
            color="bg-green-500"
          />
          <StatCard
            icon={<Mail className="h-6 w-6" />}
            label="Emails Collected"
            value={feedbackSummary?.emailsCollected || 0}
            color="bg-orange-500"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid md:grid-cols-2 gap-6">
          <Link to="/admin/analytics" className="block">
            <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-accent transition-colors">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Chat Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                View detailed chat statistics, power users, jurisdiction breakdown, and recent activity.
              </p>
              <span className="text-primary dark:text-accent font-medium text-sm">View Analytics →</span>
            </div>
          </Link>

          <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Feedback Summary</h3>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{feedbackSummary?.helpfulCounts?.yes || 0}</div>
                <div className="text-xs text-gray-500">Helpful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{feedbackSummary?.helpfulCounts?.no || 0}</div>
                <div className="text-xs text-gray-500">Not Helpful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-500">{feedbackSummary?.helpfulCounts?.too_early || 0}</div>
                <div className="text-xs text-gray-500">Too Early</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Breakdown */}
      {chatStats && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">User Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-dark rounded-lg">
                <div className="text-2xl font-bold text-blue-500">{chatStats.anonymousChats}</div>
                <div className="text-xs text-gray-500">Anonymous Chats</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-dark rounded-lg">
                <div className="text-2xl font-bold text-green-500">{chatStats.authenticatedChats}</div>
                <div className="text-xs text-gray-500">Authenticated Chats</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-dark rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{chatStats.uniqueAnonymousUsers}</div>
                <div className="text-xs text-gray-500">Unique Anonymous</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-dark rounded-lg">
                <div className="text-2xl font-bold text-orange-500">{chatStats.uniqueAuthenticatedUsers}</div>
                <div className="text-xs text-gray-500">Unique Authenticated</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Jurisdictions */}
      {chatStats?.topJurisdictions && chatStats.topJurisdictions.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-8 pb-8">
          <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Top Jurisdictions</h3>
            <div className="space-y-3">
              {chatStats.topJurisdictions.slice(0, 5).map((j: { jurisdiction: string; count: number }, index: number) => (
                <div key={j.jurisdiction} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">{index + 1}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{j.jurisdiction}</span>
                  </div>
                  <span className="text-sm text-gray-500">{j.count} messages</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
