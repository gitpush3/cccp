import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CitySelector } from "./CitySelector";
import { Chat } from "./Chat";
import { ContactsList } from "./ContactsList";

export function Dashboard() {
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"chat" | "contacts">("chat");
  const [chatId] = useState(() => `chat-${Date.now()}`);
  const user = useQuery(api.users.getCurrentUser);
  const syncAfterSuccess = useAction(api.stripe.syncAfterSuccess);

  // Handle success redirect from Stripe checkout (THEO'S PATTERN)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");

    if (success === "true" && user && user.clerkId) {
      // Call syncAfterSuccess to ensure subscription data is up to date
      syncAfterSuccess({
        clerkId: user.clerkId,
      }).then((result) => {
        if (result.success) {
          // Clear the success parameter from URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("success");
          window.history.replaceState({}, "", newUrl.toString());
        } else {
          console.error("Failed to sync subscription data:", result.error);
        }
      });
    }
  }, [user, syncAfterSuccess]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-dark transition-colors duration-300">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-300">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Select Jurisdiction
          </h3>
          <CitySelector
            selectedCity={selectedCity}
            onCitySelect={setSelectedCity}
          />
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "chat"
                ? "text-primary border-b-2 border-primary bg-primary/5 dark:bg-primary/10"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "contacts"
                ? "text-primary border-b-2 border-primary bg-primary/5 dark:bg-primary/10"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            Contacts
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === "contacts" && selectedCity && (
            <ContactsList city={selectedCity} />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-dark transition-colors duration-300">
        {activeTab === "chat" ? (
          selectedCity ? (
            <Chat chatId={chatId} jurisdiction={selectedCity} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">
                  Select a Jurisdiction
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Choose a city to start getting AI assistance with municipal codes
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">
                City Contacts
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {selectedCity
                  ? `Viewing contacts for ${selectedCity}`
                  : "Select a city to view contacts"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
