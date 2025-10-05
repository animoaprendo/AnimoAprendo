"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Send, CornerDownRight, Info } from "lucide-react";

interface Message {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
  isUnread?: boolean;
  isOwn?: boolean;
  replyTo?: Message | null;
}

interface User {
  id: number;
  name: string;
  lastMessage: string;
  unreadCount: number;
  isTyping?: boolean;
}

export default function MessagingPage() {
  const [users, setUsers] = useState<User[]>([
    { id: 1, name: "Alex Johnson", lastMessage: "See you tomorrow!", unreadCount: 2 },
    { id: 2, name: "Maria Lopez", lastMessage: "Thanks for the update!", unreadCount: 0 },
    { id: 3, name: "Chris Lee", lastMessage: "Let’s fix the issue.", unreadCount: 1 },
  ]);
  const [activeUser, setActiveUser] = useState<User | null>(users[0]);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: "Alex Johnson", text: "Hey, how’s it going?", timestamp: "10:00 AM" },
    { id: 2, sender: "You", text: "Doing great! You?", timestamp: "10:02 AM", isOwn: true },
  ]);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const newMsg: Message = {
      id: messages.length + 1,
      sender: "You",
      text: newMessage,
      timestamp: "Just now",
      isOwn: true,
      replyTo,
    };
    setMessages((prev) => [...prev, newMsg]);
    setNewMessage("");
    setReplyTo(null);
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 h-[92vh] bg-gray-100 -my-8 grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-4 w-full relative overflow-hidden">
      {/* Left Column */}
      <div className="bg-white rounded-2xl shadow p-4 flex flex-col col-span-1">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="overflow-y-auto space-y-2">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => setActiveUser(user)}
              className={`p-3 rounded-xl cursor-pointer transition ${
                activeUser?.id === user.id
                  ? "bg-green-50 border border-green-200"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm text-green-900">{user.name}</h4>
                {user.unreadCount > 0 && (
                  <span className="bg-green-700 text-white text-xs px-2 py-0.5 rounded-full">
                    {user.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{user.lastMessage}</p>
              {user.isTyping && (
                <p className="text-xs text-green-600 mt-1 animate-pulse">Typing...</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Middle Column - Chat */}
      <div className="bg-white rounded-2xl shadow flex flex-col overflow-hidden col-span-1 md:col-span-3">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-green-900 text-sm">
            {activeUser?.name ?? "Select a user"}
          </h3>
          <button
            onClick={() => setShowSidebar(true)}
            className="xl:hidden p-2 text-green-700 hover:bg-green-100 rounded-full"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[80%] w-fit p-3 rounded-2xl ${
                msg.isOwn
                  ? "ml-auto bg-green-700 text-white"
                  : "bg-green-50 text-green-900"
              }`}
            >
              {msg.replyTo && (
                <div
                  className={`text-xs mb-1 p-2 rounded-md ${
                    msg.isOwn ? "bg-green-800/40" : "bg-green-100"
                  }`}
                >
                  <CornerDownRight className="inline w-3 h-3 mr-1" />
                  <span className="italic">{msg.replyTo.text}</span>
                </div>
              )}
              <p>{msg.text}</p>
              <span className="block text-[10px] mt-1 opacity-70">{msg.timestamp}</span>
              {!msg.isOwn && (
                <button
                  onClick={() => setReplyTo(msg)}
                  className="text-[10px] mt-1 text-green-800 hover:underline select-none hover:cursor-pointer"
                >
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>

        {replyTo && (
          <div className="p-2 bg-green-50 border-t text-xs flex items-center justify-between">
            <span>
              Replying to: <span className="font-semibold">{replyTo.text}</span>
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-green-700 font-semibold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="p-3 border-t flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 bg-green-50 rounded-full px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={handleSend}
            className="bg-green-700 hover:bg-green-800 text-white p-2 rounded-full"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Column (Desktop only) */}
      <div className="bg-white rounded-2xl shadow p-4 space-y-4 col-span-1 hidden xl:block">
        <div>
          <h4 className="font-semibold text-green-900 text-sm mb-2">User Information</h4>
          <p className="text-sm text-gray-600">
            Name: <span className="font-medium">{activeUser?.name ?? "—"}</span>
          </p>
          <p className="text-sm text-gray-600">Status: Active</p>
        </div>
        <div>
          <h4 className="font-semibold text-green-900 text-sm mb-2">Reminders</h4>
          <ul className="text-sm text-gray-600 space-y-1 list-disc ml-4">
            <li>Team meeting at 3 PM</li>
            <li>Submit report by Friday</li>
            <li>Check new updates</li>
          </ul>
        </div>
      </div>

      {/* Slide-out Drawer for Mobile & Tablet */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-80 h-full p-6 shadow-lg rounded-l-2xl space-y-6 animate-slideInRight">
            <div className="flex justify-between items-center border-b pb-3">
              <h4 className="font-semibold text-green-900">User Info</h4>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-gray-500 hover:text-green-700"
              >
                ✕
              </button>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Name: <span className="font-medium">{activeUser?.name ?? "—"}</span>
              </p>
              <p className="text-sm text-gray-600">Status: Active</p>
            </div>
            <div>
              <h4 className="font-semibold text-green-900 text-sm mb-2">Reminders</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc ml-4">
                <li>Team meeting at 3 PM</li>
                <li>Submit report by Friday</li>
                <li>Check new updates</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
