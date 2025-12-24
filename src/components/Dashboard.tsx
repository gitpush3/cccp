import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CitySelector } from "./CitySelector";
import { Chat } from "./Chat";
import { ContactsList } from "./ContactsList";
import LogoOnBlack from "../assets/logo_noall_onblack_dark.png";

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
    <div className="flex h-[calc(100vh-4rem)] bg-gray-light dark:bg-dark transition-colors duration-300">
      {/* Sidebar - Deep Blue Background */}
      <div className="w-80 bg-primary text-white border-r border-primary/20 flex flex-col transition-colors duration-300 shadow-xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-center mb-6">
             <img src={LogoOnBlack} alt="3bids Logo" className="h-20 w-auto object-contain" />
          </div>
          <h3 className="text-lg font-semibold text-white/90 mb-4 tracking-wide">
            Select Jurisdiction
          </h3>
          {/* CitySelector needs to handle the dark background - passing a class or wrapping it might be needed if it has internal styles */}
          <div className="text-gray-900">
            <CitySelector
              selectedCity={selectedCity}
              onCitySelect={setSelectedCity}
            />
          </div>
        </div>

        <div className="flex border-b border-white/10 p-2 gap-2">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all rounded-full ${
              activeTab === "chat"
                ? "bg-white text-primary shadow-glow"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all rounded-full ${
              activeTab === "contacts"
                ? "bg-white text-primary shadow-glow"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            Contacts
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === "contacts" && selectedCity && (
            <div className="h-full overflow-y-auto">
               <ContactsList city={selectedCity} />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-light dark:bg-dark transition-colors duration-300">
        {activeTab === "chat" ? (
          selectedCity ? (
            <Chat chatId={chatId} jurisdiction={selectedCity} />
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
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
                City Contacts
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
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
