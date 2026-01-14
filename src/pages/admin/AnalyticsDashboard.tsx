import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { 
  MessageSquare, Users, TrendingUp, Clock, 
  MapPin, ThumbsUp, ThumbsDown, HelpCircle,
  Mail, RefreshCw
} from "lucide-react";

export default function AnalyticsDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const chatStats = useQuery(api.analytics.getChatStats);
  const recentActivity = useQuery(api.analytics.getRecentActivity, { limit: 20 });
  const feedbackSummary = useQuery(api.analytics.getFeedbackSummary);

  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "feedback" | "power_users">("overview");

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
      <div className="bg-accent text-white py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Chat Analytics Dashboard</h1>
          <p className="text-white/70 text-sm">Monitor usage, engagement, and feedback</p>
        </div>
      </div>

      {/* Stats Cards */}
      {chatStats && (
        <div className="max-w-7xl mx-auto px-4 -mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<MessageSquare className="h-6 w-6" />}
              label="Total Messages"
              value={chatStats.totalMessages.toLocaleString()}
              color="bg-blue-500"
            />
            <StatCard
              icon={<Users className="h-6 w-6" />}
              label="Total Chats"
              value={chatStats.totalChats.toLocaleString()}
              color="bg-purple-500"
            />
            <StatCard
              icon={<Clock className="h-6 w-6" />}
              label="Last 24h"
              value={`${chatStats.chatsLast24h} chats`}
              color="bg-green-500"
            />
            <StatCard
              icon={<TrendingUp className="h-6 w-6" />}
              label="Last 7 Days"
              value={`${chatStats.chatsLast7Days} chats`}
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
            { id: "activity", label: "Recent Activity" },
            { id: "feedback", label: "Feedback" },
            { id: "power_users", label: "Power Users" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "text-accent border-b-2 border-accent"
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
        {activeTab === "overview" && chatStats && (
          <OverviewTab chatStats={chatStats} feedbackSummary={feedbackSummary} />
        )}
        {activeTab === "activity" && (
          <ActivityTab recentActivity={recentActivity} />
        )}
        {activeTab === "feedback" && feedbackSummary && (
          <FeedbackTab feedbackSummary={feedbackSummary} />
        )}
        {activeTab === "power_users" && chatStats && (
          <PowerUsersTab powerUsers={chatStats.powerUsers} />
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

function OverviewTab({ chatStats, feedbackSummary }: { chatStats: any; feedbackSummary: any }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* User Breakdown */}
      <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">User Breakdown</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-dark rounded-lg">
            <p className="text-3xl font-bold text-blue-500">{chatStats.anonymousChats}</p>
            <p className="text-xs text-gray-500 mt-1">Anonymous Chats</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-dark rounded-lg">
            <p className="text-3xl font-bold text-green-500">{chatStats.authenticatedChats}</p>
            <p className="text-xs text-gray-500 mt-1">Authenticated Chats</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-dark rounded-lg">
            <p className="text-3xl font-bold text-purple-500">{chatStats.uniqueAnonymousUsers}</p>
            <p className="text-xs text-gray-500 mt-1">Unique Anonymous</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-dark rounded-lg">
            <p className="text-3xl font-bold text-orange-500">{chatStats.uniqueAuthenticatedUsers}</p>
            <p className="text-xs text-gray-500 mt-1">Unique Authenticated</p>
          </div>
        </div>
      </div>

      {/* Top Jurisdictions */}
      <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" />
          Top Jurisdictions
        </h3>
        <div className="space-y-3">
          {chatStats.topJurisdictions?.slice(0, 8).map((j: any, index: number) => (
            <div key={j.jurisdiction} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-400 w-6">{index + 1}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{j.jurisdiction}</span>
              </div>
              <span className="text-sm text-gray-500">{j.count} msgs</span>
            </div>
          ))}
          {(!chatStats.topJurisdictions || chatStats.topJurisdictions.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-4">No data yet</p>
          )}
        </div>
      </div>

      {/* Feedback Summary */}
      {feedbackSummary && (
        <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 lg:col-span-2">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Feedback Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <ThumbsUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{feedbackSummary.helpfulCounts.yes}</p>
              <p className="text-xs text-gray-500">Helpful</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <ThumbsDown className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{feedbackSummary.helpfulCounts.no}</p>
              <p className="text-xs text-gray-500">Not Helpful</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <HelpCircle className="h-6 w-6 text-gray-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-600">{feedbackSummary.helpfulCounts.too_early}</p>
              <p className="text-xs text-gray-500">Too Early</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Mail className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{feedbackSummary.emailsCollected}</p>
              <p className="text-xs text-gray-500">Emails Collected</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityTab({ recentActivity }: { recentActivity: any[] | undefined }) {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Recent Chat Activity</h3>
          <p className="text-sm text-gray-500">Latest chat sessions</p>
        </div>
        <RefreshCw className="h-5 w-5 text-gray-400" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-dark border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Jurisdiction</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Messages</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentActivity?.map((chat: any) => (
              <tr key={chat._id} className="hover:bg-gray-50 dark:hover:bg-dark transition-colors">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {chat.userInfo?.name || chat.userInfo?.email || "Anonymous"}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {chat.clerkId ? chat.clerkId.slice(0, 12) + "..." : chat.sessionId?.slice(0, 12) + "..."}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                  {chat.jurisdiction}
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-bold">
                    {chat.messageCount}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    chat.isAnonymous
                      ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  }`}>
                    {chat.isAnonymous ? "Anonymous" : "Authenticated"}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {new Date(chat.lastMessageAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(!recentActivity || recentActivity.length === 0) && (
        <div className="p-8 text-center text-gray-500">No activity yet</div>
      )}
    </div>
  );
}

function FeedbackTab({ feedbackSummary }: { feedbackSummary: any }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Roles */}
      <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">User Roles in Real Estate</h3>
        <div className="space-y-3">
          {feedbackSummary.roles?.slice(0, 10).map(([role, count]: [string, number]) => (
            <div key={role} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark rounded-lg">
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{role}</span>
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">{count}</span>
            </div>
          ))}
          {(!feedbackSummary.roles || feedbackSummary.roles.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-4">No role data yet</p>
          )}
        </div>
      </div>

      {/* Market Requests */}
      <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Requested Markets</h3>
        <div className="space-y-3">
          {feedbackSummary.markets?.slice(0, 10).map(([market, count]: [string, number]) => (
            <div key={market} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark rounded-lg">
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{market}</span>
              <span className="px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-bold">{count}</span>
            </div>
          ))}
          {(!feedbackSummary.markets || feedbackSummary.markets.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-4">No market requests yet</p>
          )}
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 lg:col-span-2">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Recent Feedback</h3>
        <div className="space-y-3">
          {feedbackSummary.recentFeedback?.map((f: any) => (
            <div key={f._id} className="p-4 bg-gray-50 dark:bg-dark rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  f.isHelpful === "yes" ? "bg-green-100 text-green-800" :
                  f.isHelpful === "no" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {f.isHelpful === "yes" ? "Helpful" : f.isHelpful === "no" ? "Not Helpful" : "Too Early"}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(f.submittedAt).toLocaleDateString()}
                </span>
              </div>
              {f.roleInRealEstate && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Role:</span> {f.roleInRealEstate}
                </p>
              )}
              {f.otherMarkets && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Market:</span> {f.otherMarkets}
                </p>
              )}
              {f.email && (
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <span className="font-medium">Email:</span> {f.email}
                </p>
              )}
            </div>
          ))}
          {(!feedbackSummary.recentFeedback || feedbackSummary.recentFeedback.length === 0) && (
            <p className="text-gray-500 text-sm text-center py-4">No feedback yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PowerUsersTab({ powerUsers }: { powerUsers: any[] }) {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white">Power Users</h3>
        <p className="text-sm text-gray-500">Top users by message count</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-dark border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">User ID</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Messages</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {powerUsers?.map((user: any, index: number) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark transition-colors">
                <td className="px-4 py-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? "bg-yellow-100 text-yellow-800" :
                    index === 1 ? "bg-gray-200 text-gray-700" :
                    index === 2 ? "bg-orange-100 text-orange-800" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <code className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {user.id.slice(0, 20)}...
                  </code>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    user.type === "authenticated"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                    {user.type}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{user.count}</span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {new Date(user.lastActive).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(!powerUsers || powerUsers.length === 0) && (
        <div className="p-8 text-center text-gray-500">No users yet</div>
      )}
    </div>
  );
}
