import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Upload, Send, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ChatProps {
  chatId: string;
  jurisdiction: string;
}

function renderContentWithLinks(content: string) {
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
          className="underline break-words text-primary dark:text-primary"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function Chat({ chatId, jurisdiction }: ChatProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(api.messages.getChatMessages, { chatId });
  const addMessage = useMutation(api.messages.addMessage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const chatWithPro = useAction(api.actions.chatWithPro);
  const user = useQuery(api.users.getCurrentUser);

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
    if ((!message.trim() && !selectedFile) || !user || isLoading) return;

    const currentMessage = message.trim();
    const currentFile = selectedFile;
    const userId = user.clerkId;

    if (!userId) return;

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
        userId: userId,
        role: "user",
        content: messageContent,
        imageStorageId,
      });

      if (currentMessage && userId) {
        const response = await chatWithPro({
          clerkId: userId,
          question: currentMessage,
          jurisdiction,
          chatId,
        });

        if (response.error === "payment_required") {
          await addMessage({
            chatId,
            userId: userId,
            role: "assistant",
            content: "⚠️ Pro subscription required for AI assistance. Please upgrade to continue.",
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

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-dark transition-colors duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-surface shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
          Comrade AI - {jurisdiction}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ask questions about municipal codes, building regulations, and receive state-approved guidance.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {messages?.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                msg.role === "user"
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Uploaded"
                  className="w-full h-auto rounded mb-2 max-h-48 object-cover border border-gray-200 dark:border-gray-700"
                />
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {renderContentWithLinks(msg.content)}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-surface">
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
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
              placeholder="Ask about codes, regulations, or upload blueprints..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
              disabled={isLoading}
            />
            
            <button
              type="submit"
              disabled={(!message.trim() && !selectedFile) || isLoading}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm"
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
