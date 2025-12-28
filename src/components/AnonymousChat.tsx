import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Upload, Send, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { SignInButton } from "@clerk/clerk-react";
import { getOrCreateSessionId, incrementSessionMessageCount, getSessionMessageCount } from "../utils/sessionUtils";

interface AnonymousChatProps {
  chatId: string;
  jurisdiction: string;
}

function renderContentWithLinks(content: string, isUser: boolean) {
  const urlRegex = /(https?:\/\/[^\s)\]}>,"']+)/g;
  const parts = content.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noreferrer"
          className={`underline break-words ${isUser ? "text-white" : "text-primary dark:text-primary"}`}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function AnonymousChat({ chatId, jurisdiction }: AnonymousChatProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId] = useState(() => getOrCreateSessionId());
  const [messageCount, setMessageCount] = useState(() => getSessionMessageCount());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(api.messages.getChatMessages, { chatId });
  const addMessage = useMutation(api.messages.addMessage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const chatWithPro = useAction(api.actions.chatWithPro);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    const uploadUrl = await generateUploadUrl();
    
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!result.ok) {
      throw new Error("Upload failed");
    }

    const { storageId } = await result.json();
    return storageId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || isLoading) return;

    // Check message limit
    if (messageCount >= 5) {
      toast.error("You've reached your 5 free messages. Sign up to continue!");
      return;
    }

    const currentMessage = message.trim();
    const currentFile = selectedFile;

    // Clear input immediately for better UX
    setMessage("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsLoading(true);

    try {
      let imageStorageId;
      if (currentFile) {
        imageStorageId = await uploadFile(currentFile);
      }

      const messageContent = currentMessage || "Uploaded image for analysis";

      await addMessage({
        chatId,
        sessionId,
        role: "user",
        content: messageContent,
        imageStorageId,
        isAnonymous: true,
      });

      // Increment message count
      const newCount = incrementSessionMessageCount();
      setMessageCount(newCount);

      if (currentMessage) {
        const response = await chatWithPro({
          sessionId,
          question: currentMessage,
          jurisdiction,
          chatId,
        });

        if (response.error === "signup_required") {
          await addMessage({
            chatId,
            sessionId,
            role: "assistant",
            content: "🎉 You've used your 5 free messages! Sign up to get 5 more messages and unlock additional features.",
            isAnonymous: true,
          });
        } else if (response.error === "payment_required") {
          await addMessage({
            chatId,
            sessionId,
            role: "assistant",
            content: "⚠️ Pro subscription required for AI assistance. Please upgrade to continue.",
            isAnonymous: true,
          });
        } else if (response.error) {
          toast.error(response.message ?? "We couldn't complete that request. Please try again.");
          setMessage(currentMessage); // Restore message on error
          return;
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Something went wrong sending your message. Please try again.");
      setMessage(currentMessage); // Restore message on error
    } finally {
      setIsLoading(false);
    }
  };

  const remainingMessages = Math.max(0, 5 - messageCount);

  // Quick action prompts to showcase app capabilities
  const quickActions = [
    { emoji: "🏠", text: "What's the most recent sale?" },
    { emoji: "📋", text: "Do I need a Point of Sale inspection?" },
    { emoji: "💰", text: "Show me tax delinquent properties" },
    { emoji: "📊", text: "Best zip codes for rentals?" },
  ];

  const handleQuickAction = (prompt: string) => {
    if (remainingMessages === 0 || isLoading) return;
    setMessage(prompt);
    // Auto-submit after a brief delay so user sees what's being sent
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    }, 100);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 dark:bg-dark transition-colors duration-300">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-surface shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              AI Assistant - {jurisdiction}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Ask questions about municipal codes, building regulations, and receive state-approved guidance.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {remainingMessages} free messages left
            </div>
            <SignInButton mode="modal">
              <button className="text-xs text-primary dark:text-accent hover:underline">
                Sign up for 5 more →
              </button>
            </SignInButton>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {/* Quick Actions - show when no messages */}
        {(!messages || messages.length === 0) && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                👋 Welcome! Try asking:
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Click a question or type your own
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.text)}
                  disabled={remainingMessages === 0}
                  className="flex items-center gap-3 p-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary dark:hover:border-accent hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">{action.emoji}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages?.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-md lg:max-w-lg px-5 sm:px-6 py-3 shadow-md ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-3xl rounded-tr-sm"
                  : "bg-white text-primary dark:text-primary rounded-3xl rounded-tl-sm border border-gray-100 dark:border-gray-700"
              }`}
            >
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Uploaded"
                  className="w-full h-auto rounded-xl mb-3 max-h-48 object-cover border border-white/20"
                />
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">
                {renderContentWithLinks(msg.content, msg.role === "user")}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-6 py-4 shadow-md bg-white text-primary rounded-3xl rounded-tl-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-surface pt-3 sm:pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] px-3 sm:px-4">
        {remainingMessages === 0 && (
          <div className="mb-3 p-3 bg-accent/10 border border-accent/20 rounded-lg text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              🎉 You've used all 5 free messages!
            </p>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium text-sm transition-colors">
                Sign Up for 5 More Messages
              </button>
            </SignInButton>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-3">
          {selectedFile && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
              <ImageIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="file"
              id="file-upload"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf"
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={remainingMessages === 0}
              className="h-11 w-11 inline-flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload Document"
            >
              <Upload className="h-5 w-5" />
            </button>
            
            <input
              type="text"
              id="message-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={remainingMessages > 0 ? "Ask about codes, regulations, or upload blueprints..." : "Sign up to continue chatting..."}
              className="flex-1 h-11 px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || remainingMessages === 0}
            />
            
            <button
              type="submit"
              disabled={(!message.trim() && !selectedFile) || isLoading || remainingMessages === 0}
              className="h-11 px-5 bg-primary text-white rounded-full hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-colors shadow-sm flex-shrink-0"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}