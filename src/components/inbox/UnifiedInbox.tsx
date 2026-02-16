"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Send,
  Facebook,
  Instagram,
  Video,
  MessageSquare,
  Phone,
  MoreVertical,
  Image as ImageIcon,
  Paperclip,
  Smile,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const platformIcons = {
  Facebook: { icon: Facebook, color: "bg-blue-600", textColor: "text-blue-600" },
  Instagram: { icon: Instagram, color: "bg-pink-600", textColor: "text-pink-600" },
  WhatsApp: { icon: MessageSquare, color: "bg-green-600", textColor: "text-green-600" },
  TikTok: { icon: Video, color: "bg-black", textColor: "text-black" },
};

interface Message {
  id: number;
  conversationId: number;
  platform: string;
  direction: "inbound" | "outbound";
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  timestamp: Date;
  status: string | null;
}

interface Conversation {
  id: number;
  channelId: number | null;
  platform: string;
  userName: string;
  lastMessage: string;
  time: Date;
  unread: boolean;
  avatar: string | null;
  unreadCount: number;
  latestMessage: Message | null;
}

export default function UnifiedInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    
    // Set up polling for new messages every 30 seconds
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConversation) {
        fetchMessages(selectedConversation.id);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/messages");
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const markAsRead = async (conversationId: number) => {
    try {
      await fetch(`/api/messages/${conversationId}/read`, { method: "POST" });
      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread: false, unreadCount: 0 } : conv
        )
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    const messageContent = messageText.trim();
    setMessageText("");

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          platform: selectedConversation.platform,
          content: messageContent,
          channelId: selectedConversation.channelId,
        }),
      });

      const data = await response.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        // Update conversation list
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation.id
              ? {
                  ...conv,
                  lastMessage: messageContent,
                  time: new Date(),
                  latestMessage: data.message,
                }
              : conv
          )
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessageText(messageContent); // Restore message on error
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return d.toLocaleDateString();
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPlatformInfo =
    selectedConversation &&
    platformIcons[selectedConversation.platform as keyof typeof platformIcons];

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-full md:w-80 border-r border-gray-200 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Unified Inbox</h1>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              Live
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No conversations found</div>
          ) : (
            filteredConversations.map((conv) => {
              const platformInfo =
                platformIcons[conv.platform as keyof typeof platformIcons] ||
                platformIcons.WhatsApp;
              const Icon = platformInfo.icon;
              const isSelected = selectedConversation?.id === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50 border-l-4 border-l-blue-600"
                      : conv.unread
                      ? "bg-blue-50/30 hover:bg-blue-50/50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center font-bold text-white text-lg">
                        {conv.userName?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 p-1.5 rounded-full ${platformInfo.color} text-white border-2 border-white shadow-sm`}
                      >
                        <Icon size={12} />
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <h3 className="font-bold text-gray-900 text-sm truncate">
                          {conv.userName}
                        </h3>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                          {formatTime(conv.time)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-1">
                        {conv.lastMessage}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded ${platformInfo.textColor} bg-gray-100`}
                        >
                          {conv.platform}
                        </span>
                        {conv.unread && (
                          <div className="flex items-center gap-1 bg-red-100 px-1.5 py-0.5 rounded text-[10px] text-red-600 font-bold">
                            <Clock size={10} />
                            <span>Unread</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Chat Header */}
          <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center font-bold text-white">
                  {selectedConversation.userName?.charAt(0).toUpperCase() || "?"}
                </div>
                {selectedPlatformInfo && (
                  <div
                    className={`absolute -bottom-1 -right-1 p-1 rounded-full ${selectedPlatformInfo.color} text-white border-2 border-white`}
                  >
                    <selectedPlatformInfo.icon size={10} />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {selectedConversation.userName}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="text-[10px] text-gray-500">
                    {selectedConversation.platform} • Active
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Phone size={18} />
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical size={18} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOutbound = msg.direction === "outbound";
                const showDate =
                  idx === 0 ||
                  new Date(msg.timestamp).toDateString() !==
                    new Date(messages[idx - 1].timestamp).toDateString();

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 bg-gray-200 rounded-full text-[10px] font-bold text-gray-500 uppercase">
                          {new Date(msg.timestamp).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex items-end gap-2 max-w-[75%] ${
                        isOutbound ? "ml-auto flex-row-reverse" : ""
                      }`}
                    >
                      {!isOutbound && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          {selectedConversation.userName?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2 shadow-sm ${
                          isOutbound
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-white text-gray-900 rounded-bl-none border border-gray-200"
                        }`}
                      >
                        {msg.mediaUrl && (
                          <div className="mb-2 rounded-lg overflow-hidden">
                            <img
                              src={msg.mediaUrl}
                              alt="Attachment"
                              className="max-w-xs rounded-lg"
                            />
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div
                          className={`flex items-center gap-1 mt-1 text-[10px] ${
                            isOutbound ? "text-blue-100" : "text-gray-400"
                          }`}
                        >
                          <span>{formatTime(msg.timestamp)}</span>
                          {isOutbound && (
                            <span>
                              {msg.status === "read" ? (
                                <CheckCheck size={12} />
                              ) : msg.status === "delivered" ? (
                                <CheckCheck size={12} className="opacity-50" />
                              ) : msg.status === "sent" ? (
                                <Check size={12} />
                              ) : (
                                <Clock size={12} />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOutbound && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          You
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Paperclip size={18} />
              </Button>
              <Button variant="ghost" size="sm">
                <ImageIcon size={18} />
              </Button>
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder={`Reply on ${selectedConversation.platform}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="sm"
                >
                  <Send size={16} />
                </Button>
              </div>
              <Button variant="ghost" size="sm">
                <Smile size={18} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">
              Select a conversation
            </h3>
            <p className="text-sm text-gray-400">
              Choose a conversation from the sidebar to start messaging
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

