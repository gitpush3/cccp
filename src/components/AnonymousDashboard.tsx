import { useState } from "react";
import { AnonymousChat } from "./AnonymousChat";
import { CitySelector } from "./CitySelector";
import { Plus, Menu, X, Sparkles } from "lucide-react";
import FaviconLogo from "../assets/3fav-180x180_360.png";

export function AnonymousDashboard() {
  const [chatId] = useState(() => `anon-chat-${Date.now()}`);
  const [selectedCity, setSelectedCity] = useState<string>("Cuyahoga County");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const startNewChat = () => {
    window.location.reload();
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-0
        ${isDesktopSidebarCollapsed ? 'lg:w-20' : 'lg:w-80'}
        ${isMobileSidebarOpen ? 'w-80' : 'w-0 lg:w-20 lg:w-80'}
        bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white
        transition-all duration-300 ease-in-out
        flex flex-col overflow-hidden
        shadow-2xl shadow-black/20
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          {!isDesktopSidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={FaviconLogo} alt="3bids" className="h-10 w-10 object-cover rounded-xl shadow-lg border-2 border-accent" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <Sparkles className="w-2 h-2 text-white" />
                </div>
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight">Code Chat</span>
                <p className="text-xs text-slate-400">AI-Powered Assistant</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            className="hidden lg:flex p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-400" />
          </button>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isDesktopSidebarCollapsed && (
          <>
            {/* New Chat Button */}
            <div className="p-4">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-3
                  bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70
                  text-white rounded-xl font-semibold transition-all duration-200
                  shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30
                  hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="h-5 w-5" />
                New Chat
              </button>
            </div>

            {/* Jurisdiction Selector */}
            <div className="px-4 pb-4">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Jurisdiction
              </label>
              <CitySelector
                selectedCity={selectedCity}
                onCitySelect={setSelectedCity}
              />
            </div>

            {/* Divider */}
            <div className="mx-4 border-t border-white/10" />

            {/* What you can ask */}
            <div className="flex-1 p-4 overflow-y-auto">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Try asking
              </h3>
              <div className="space-y-2">
                {[
                  "I have a property I need information on",
                  "How many smoke alarms do I need per sq ft in Lakewood?",
                  "Please show me pre-foreclosure leads in Cuyahoga County",
                  "What city code does Brecksville have vs state code?",
                ].map((question, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-slate-300
                      cursor-pointer transition-all duration-200 hover:translate-x-1
                      border border-transparent hover:border-white/10"
                  >
                    "{question}"
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <span>Powered by</span>
                <a
                  href="https://3bids.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  3bids.io
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-slate-700/50">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-slate-400" />
          </button>
          <div className="font-semibold text-gray-900 dark:text-white">
            Cuyahoga County Code Chat
          </div>
          <div className="w-10" />
        </div>

        {/* Chat Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnonymousChat
            chatId={chatId}
            jurisdiction={selectedCity || "Cuyahoga County"}
          />
        </div>
      </div>
    </div>
  );
}
