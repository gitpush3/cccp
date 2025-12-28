import { useState } from "react";
import { CitySelector } from "./CitySelector";
import { AnonymousChat } from "./AnonymousChat";
import { SignInButton } from "@clerk/clerk-react";
import { Plus, Menu, X } from "lucide-react";
import LogoOnBlack from "../assets/logo_noall_onblack_dark.png";
import { getSessionMessageCount } from "../utils/sessionUtils";

export function AnonymousDashboard() {
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [chatId] = useState(() => `anon-chat-${Date.now()}`);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const messageCount = getSessionMessageCount();
  const remainingMessages = Math.max(0, 5 - messageCount);

  const startNewChat = () => {
    window.location.reload(); // Simple way to start fresh for anonymous users
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-0
        ${isDesktopSidebarCollapsed ? 'lg:w-16' : 'lg:w-80'}
        ${isMobileSidebarOpen ? 'w-80' : 'w-0 lg:w-16 lg:w-80'}
        bg-primary text-white transition-all duration-300 ease-in-out
        flex flex-col overflow-hidden
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {!isDesktopSidebarCollapsed && (
            <div className="flex items-center gap-3">
              <img src={LogoOnBlack} alt="Logo" className="h-8 w-8 object-cover rounded-full" />
              <span className="font-bold text-lg">Anonymous Chat</span>
            </div>
          )}
          <button
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            className="hidden lg:block p-1 hover:bg-white/10 rounded"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-white/10 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isDesktopSidebarCollapsed && (
          <>
            {/* Message Counter */}
            <div className="p-3 border-b border-white/10">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{remainingMessages}</div>
                <div className="text-sm opacity-90">free messages left</div>
                <SignInButton mode="modal">
                  <button className="mt-2 text-xs bg-accent hover:bg-accent/90 px-3 py-1 rounded-full transition-colors">
                    Sign up for 5 more
                  </button>
                </SignInButton>
              </div>
            </div>

            {/* New Chat Button */}
            <div className="p-3 border-b border-white/10">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </button>
            </div>

            {/* City Selector */}
            <div className="p-3 border-b border-white/10">
              <CitySelector 
                selectedCity={selectedCity} 
                onCitySelect={setSelectedCity}
              />
            </div>

            {/* Features Preview */}
            <div className="flex-1 p-3 overflow-y-auto">
              <div className="space-y-3">
                <div className="text-sm font-semibold opacity-90">What you can ask:</div>
                <div className="space-y-2 text-xs opacity-75">
                  <div className="bg-white/5 rounded p-2">
                    "What's the permit fee for a roof in Lakewood?"
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    "Tell me about 1234 Main St Cleveland"
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    "Do I need a permit for electrical work?"
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-white/10 rounded-lg">
                  <div className="text-sm font-semibold mb-2">Sign up to unlock:</div>
                  <ul className="text-xs space-y-1 opacity-90">
                    <li>• 5 more messages</li>
                    <li>• Chat history</li>
                    <li>• File uploads</li>
                    <li>• Pro upgrade option</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Sign Up CTA */}
            <div className="p-3 border-t border-white/10">
              <SignInButton mode="modal">
                <button className="w-full px-4 py-2 bg-white text-primary rounded-lg font-medium hover:bg-gray-100 transition-colors">
                  Sign Up Free
                </button>
              </SignInButton>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-center">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {remainingMessages} messages left
            </div>
            <SignInButton mode="modal">
              <button className="text-xs text-primary dark:text-accent hover:underline">
                Sign up for more
              </button>
            </SignInButton>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 min-h-0">
          {selectedCity ? (
            <AnonymousChat 
              chatId={chatId} 
              jurisdiction={selectedCity} 
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-dark">
              <div className="text-center max-w-md mx-auto p-8">
                <div className="mb-6">
                  <img src={LogoOnBlack} alt="Logo" className="h-16 w-16 mx-auto mb-4 rounded-full" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Welcome to Anonymous Chat
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Get instant answers about building codes, permits, and property information.
                  </p>
                </div>
                
                <div className="mb-6">
                  <div className="text-3xl font-bold text-primary dark:text-accent mb-1">
                    {remainingMessages}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    free messages remaining
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Select a city from the sidebar to start chatting
                  </p>
                  <SignInButton mode="modal">
                    <button className="px-6 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors">
                      Sign Up for More Messages
                    </button>
                  </SignInButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}