import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CitySelector } from "./CitySelector";
import { Chat } from "./Chat";
import { ContactsList } from "./ContactsList";
import LogoOnBlack from "../assets/logo_noall_onblack_dark.png";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Menu, X, Plus, MessageSquare } from "lucide-react";

export function Dashboard() {
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [chatId, setChatId] = useState(() => `chat-${Date.now()}`);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isCitiesExpanded, setIsCitiesExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const user = useQuery(api.users.getCurrentUser);
  const chatHistory = useQuery(api.chats.getUserChats, user?.clerkId ? { clerkId: user.clerkId } : "skip");

  useEffect(() => {
    if (selectedCity) {
      setIsMobileSidebarOpen(false);
    }
  }, [selectedCity]);

  const startNewChat = () => {
    setChatId(`chat-${Date.now()}`);
    setSelectedCity("");
  };

  const loadChat = (historyChatId: string, city: string) => {
    setChatId(historyChatId);
    setSelectedCity(city);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-light dark:bg-dark transition-colors duration-300 overflow-hidden">
      {isMobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed top-16 bottom-0 left-0 right-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar - Deep Blue Background */}
      <div
        className={`fixed top-16 bottom-0 left-0 z-40 bg-primary text-white border-r border-primary/20 flex flex-col transition-all duration-300 shadow-xl md:fixed md:top-16 md:bottom-0 md:left-0 md:z-40 ${
          isDesktopSidebarCollapsed ? "w-80 md:w-16" : "w-80"
        } ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-4 md:p-6 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 flex justify-center">
              <img
                src={LogoOnBlack}
                alt="Logo"
                className={`${isDesktopSidebarCollapsed ? "h-10" : "h-16 md:h-20"} w-auto object-contain`}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={isDesktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setIsDesktopSidebarCollapsed((v) => !v)}
                className="hidden md:inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-white/10 transition-colors"
              >
                {isDesktopSidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {!isDesktopSidebarCollapsed && (
          <>
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

            {/* Collapsible Cities Section */}
            <div className="border-b border-white/10">
              <button
                onClick={() => setIsCitiesExpanded(!isCitiesExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">
                  Select Jurisdiction
                </h3>
                {isCitiesExpanded ? (
                  <ChevronUp className="h-4 w-4 text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/60" />
                )}
              </button>
              {isCitiesExpanded && (
                <div className="px-4 pb-4 text-gray-900">
                  <CitySelector selectedCity={selectedCity} onCitySelect={setSelectedCity} />
                </div>
              )}
            </div>

            {/* Collapsible Chat History Section */}
            <div className="border-b border-white/10">
              <button
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">
                  Chat History
                </h3>
                {isHistoryExpanded ? (
                  <ChevronUp className="h-4 w-4 text-white/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/60" />
                )}
              </button>
              {isHistoryExpanded && (
                <div className="px-2 pb-2 max-h-48 overflow-y-auto">
                  {chatHistory && chatHistory.length > 0 ? (
                    chatHistory.map((chat) => (
                      <button
                        key={chat._id}
                        onClick={() => loadChat(chat.chatId, chat.city)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                          chatId === chat.chatId
                            ? "bg-white/20 text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{chat.title}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-white/50 text-sm px-3 py-2">No chat history yet</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex-1 overflow-hidden">
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-0 bg-gray-light dark:bg-dark transition-colors duration-300 ${
        isDesktopSidebarCollapsed ? "md:ml-16" : "md:ml-80"
      }`}>
        <div className="md:hidden flex items-center gap-3 px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <Menu className="h-5 w-5 text-gray-800 dark:text-gray-100" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {selectedCity || "Select Jurisdiction"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              AI Assistant
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {selectedCity ? (
            <div className="flex-1 min-h-0 flex justify-center">
              <div className="w-full min-h-0 flex flex-col md:px-6 lg:px-10">
                <div className="w-full flex-1 min-h-0 mx-auto md:max-w-3xl lg:max-w-4xl">
                  <Chat chatId={chatId} jurisdiction={selectedCity} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
                  Select a Jurisdiction
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Choose a city to start getting AI assistance with municipal codes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
