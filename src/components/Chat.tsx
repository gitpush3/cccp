import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Upload, Send, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ChatProps {
  chatId: string;
  jurisdiction: string;
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

    const originalMessage = message;
    const userId = user.clerkId;

    if (!userId) return;

    setIsLoading(true);

    try {
      let imageStorageId;
      if (selectedFile) {
        imageStorageId = await uploadFile(selectedFile);
      }

      const messageContent = message.trim() || "Uploaded image for analysis";

      await addMessage({
        chatId,
        userId: userId,
        role: "user",
        content: messageContent,
        imageStorageId,
      });

      if (message.trim() && userId) {
        const response = await chatWithPro({
          clerkId: userId,
          question: message,
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
          setMessage(originalMessage);
          return;
        }
      }

      setMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Something went wrong sending your message. Please try again.");
      setMessage(originalMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">
          AI Assistant - {jurisdiction}
        </h2>
        <p className="text-sm text-gray-500">
          Ask questions about municipal codes, building regulations, and get expert advice
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Uploaded"
                  className="w-full h-auto rounded mb-2 max-h-48 object-cover"
                />
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="space-y-3">
          {selectedFile && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
              <ImageIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-red-500 hover:text-red-700 text-sm"
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
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md"
            >
              <Upload className="h-5 w-5" />
            </button>
            
            <input
              type="text"
              id="message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about codes, regulations, or upload blueprints..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            
            <button
              type="submit"
              disabled={(!message.trim() && !selectedFile) || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
