"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Upload, Send, Loader2 } from "lucide-react";

interface Message {
  _id: Id<"messages">;
  role: "user" | "assistant";
  content: string;
  imageId?: Id<"_storage">;
  citedRegulations: Id<"regulationUrls">[];
  timestamp: number;
}

interface ChatInterfaceProps {
  conversationId: Id<"conversations">;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Query messages
  const messages = useQuery(api.conversations.getMessages, {
    conversationId,
    limit: 50,
  });

  // Mutations
  const sendMessage = useMutation(api.chat.sendMessage);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    setIsLoading(true);

    try {
      let imageId: Id<"_storage"> | undefined;

      // Upload image if selected
      if (selectedImage) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedImage.type },
          body: selectedImage,
        });
        const { storageId } = await result.json();
        imageId = storageId;
      }

      // Send message
      await sendMessage({
        conversationId,
        content: input || "Please analyze this image for building code compliance.",
        imageId,
      });

      // Reset input
      setInput("");
      setSelectedImage(null);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((message) => (
          <div
            key={message._id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {message.imageId && (
                <div className="mb-2">
                  <img
                    src={`/api/storage/${message.imageId}`}
                    alt="Uploaded"
                    className="rounded-lg max-w-full h-auto"
                  />
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Show cited regulations */}
              {message.citedRegulations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="text-xs font-semibold mb-1">Sources:</p>
                  {message.citedRegulations.map((regId, idx) => (
                    <div key={idx} className="text-xs">
                      📋 Regulation #{idx + 1}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-xs opacity-70 mt-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        {selectedImage && (
          <div className="mb-2 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
            <span className="text-sm">{selectedImage.name}</span>
            <button
              onClick={() => setSelectedImage(null)}
              className="text-red-600 text-sm"
            >
              Remove
            </button>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg border hover:bg-gray-50"
            disabled={isLoading}
          >
            <Upload className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about building codes or upload a photo..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            disabled={isLoading}
          />
          
          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Ask about specific codes, compare municipalities, or upload photos for analysis
        </p>
      </div>
    </div>
  );
}
