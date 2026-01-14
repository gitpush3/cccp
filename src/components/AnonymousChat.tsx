import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Send, Building2, Flame, FileText, Scale } from "lucide-react";
import { toast } from "sonner";
import { getOrCreateSessionId, incrementSessionMessageCount, getSessionMessageCount } from "../utils/sessionUtils";
import { FeedbackModal } from "./FeedbackModal";
import { EmailCaptureModal } from "./EmailCaptureModal";

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
          className={`underline break-words ${isUser ? "text-white/90 hover:text-white" : "text-accent hover:text-accent/80"} transition-colors`}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

const FREE_MESSAGES = 10;
const FEEDBACK_TRIGGER = 8;

export function AnonymousChat({ chatId, jurisdiction }: AnonymousChatProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => getOrCreateSessionId());
  const [messageCount, setMessageCount] = useState(() => getSessionMessageCount());
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [hasEmail, setHasEmail] = useState(() => localStorage.getItem("email-consent-given") === "true");
  const [feedbackGiven, setFeedbackGiven] = useState(() => localStorage.getItem("feedback-given") === "true");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useQuery(api.messages.getChatMessages, { chatId });
  const addMessage = useMutation(api.messages.addMessage);
  const chatWithPro = useAction(api.actions.chatWithPro);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    if (messageCount >= FREE_MESSAGES && !hasEmail) {
      setShowEmailModal(true);
      return;
    }

    const currentMessage = message.trim();
    setMessage("");
    setIsLoading(true);

    try {
      await addMessage({
        chatId,
        sessionId,
        role: "user",
        content: currentMessage,
        isAnonymous: true,
      });

      const newCount = incrementSessionMessageCount();
      setMessageCount(newCount);

      if (newCount === FEEDBACK_TRIGGER && !feedbackGiven) {
        setTimeout(() => setShowFeedbackModal(true), 1500);
      }

      if (newCount === FREE_MESSAGES && !hasEmail) {
        setTimeout(() => setShowEmailModal(true), 1500);
      }

      const response = await chatWithPro({
        sessionId,
        question: currentMessage,
        jurisdiction,
        chatId,
      });

      if (response.error === "signup_required" && !hasEmail) {
        setShowEmailModal(true);
      } else if (response.error) {
        toast.error(response.message ?? "Something went wrong. Please try again.");
        setMessage(currentMessage);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Something went wrong. Please try again.");
      setMessage(currentMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const canSendMessage = hasEmail || messageCount < FREE_MESSAGES;

  const handleFeedbackSubmit = (feedback: { rating: number; useCase: string; helpful: boolean }) => {
    console.log("Feedback received:", feedback);
    setFeedbackGiven(true);
  };

  const handleEmailSubmitted = () => {
    setHasEmail(true);
    setShowEmailModal(false);
    toast.success("Thanks! You can now continue chatting.");
  };

  const quickActions = [
    { icon: Building2, text: "Look up 3456 E 147th St Cleveland", color: "from-blue-500 to-blue-600" },
    { icon: Flame, text: "What are the smoke detector requirements in Lakewood?", color: "from-orange-500 to-red-500" },
    { icon: FileText, text: "Show me pre-foreclosure leads in Cuyahoga County", color: "from-emerald-500 to-teal-500" },
    { icon: Scale, text: "Compare Brecksville codes vs Ohio state code", color: "from-purple-500 to-indigo-500" },
  ];

  const handleQuickAction = (prompt: string) => {
    if (!canSendMessage || isLoading) return;
    setMessage(prompt);
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    }, 100);
  };

  const hasMessages = messages && messages.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome Screen */}
        {!hasMessages && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/70 shadow-lg shadow-accent/25 mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                How can I help you today?
              </h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm sm:text-base">
                Ask about building codes, permits, property info, or investment opportunities
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.text)}
                    disabled={!canSendMessage}
                    className="group flex items-start gap-4 p-4 bg-white dark:bg-slate-800/50
                      border border-gray-200 dark:border-slate-700/50 rounded-2xl
                      hover:border-gray-300 dark:hover:border-slate-600
                      hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20
                      transition-all duration-200 text-left
                      disabled:opacity-50 disabled:cursor-not-allowed
                      hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${action.color}
                      flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300 leading-relaxed">
                      {action.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        {hasMessages && (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages?.map((msg) => (
              <div
                key={msg._id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-xl px-5 py-3.5 ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary/90 text-white rounded-2xl rounded-tr-md shadow-lg shadow-primary/20"
                      : "bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-2xl rounded-tl-md shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-slate-700/50"
                  }`}
                >
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="Uploaded"
                      className="w-full h-auto rounded-xl mb-3 max-h-48 object-cover"
                    />
                  )}
                  <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                    {renderContentWithLinks(msg.content, msg.role === "user")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-start">
              <div className="px-5 py-4 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-md shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200/80 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:px-6">
          {!canSendMessage && !hasEmail && (
            <div className="mb-4 p-4 bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-xl text-center">
              <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                Enter your email to continue chatting
              </p>
              <button
                onClick={() => setShowEmailModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70
                  text-white rounded-xl font-semibold text-sm transition-all duration-200
                  shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30"
              >
                Continue Free
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading || !canSendMessage}
              className="flex-1 h-12 sm:h-14 px-5 bg-gray-100 dark:bg-slate-800
                text-gray-900 dark:text-white rounded-xl
                border-2 border-transparent
                focus:border-accent focus:bg-white dark:focus:bg-slate-700
                focus:outline-none focus:ring-4 focus:ring-accent/10
                placeholder-gray-400 dark:placeholder-slate-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 text-sm sm:text-base"
            />
            <button
              type="submit"
              disabled={!message.trim() || isLoading || !canSendMessage}
              className="h-12 sm:h-14 w-12 sm:w-14 bg-gradient-to-br from-primary to-primary/90
                text-white rounded-xl
                hover:from-primary/90 hover:to-primary/80
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center transition-all duration-200
                shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30
                hover:-translate-y-0.5 active:translate-y-0
                disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Modals */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
      />
      <EmailCaptureModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onEmailSubmitted={handleEmailSubmitted}
        sessionId={sessionId}
      />
    </div>
  );
}
