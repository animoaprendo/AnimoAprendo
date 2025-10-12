"use client";

import { useRef, useEffect } from "react";
import { Send, Search, Info, Menu } from "lucide-react";
import { Message, User } from "./types";
import MessageBubble from "./MessageBubble";

interface MessagesContainerProps {
  messages: Message[];
  activeUser: User | null;
  userId: string;
  userRole: "tutee" | "tutor";
  pendingMessages: Set<string>;
  onReply: (messageId: string) => void;
  onAppointmentResponse: (msg: Message, action: "accepted" | "declined" | "cancelled") => void;
  onOpenAppointmentModal: () => void;
  onShowSidebar: () => void;
  onShowUserListDrawer?: () => void;
  users?: any[];
}

export default function MessagesContainer({
  messages,
  activeUser,
  userId,
  userRole,
  pendingMessages,
  onReply,
  onAppointmentResponse,
  onOpenAppointmentModal,
  onShowSidebar,
  onShowUserListDrawer,
  users = []
}: MessagesContainerProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="bg-white h-full rounded-2xl shadow flex flex-col overflow-hidden col-span-1 md:col-span-3">
      <MessagesHeader
        activeUser={activeUser}
        userRole={userRole}
        onOpenAppointmentModal={onOpenAppointmentModal}
        onShowSidebar={onShowSidebar}
        onShowUserListDrawer={onShowUserListDrawer}
        users={users}
      />

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {!activeUser ? (
          <NoActiveUserState />
        ) : messages.length === 0 ? (
          <EmptyMessagesState activeUser={activeUser} />
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={`${msg._id}-${msg.createdAt}`}
              message={msg}
              userId={userId}
              pendingMessages={pendingMessages}
              onReply={onReply}
              onAppointmentResponse={onAppointmentResponse}
              userRole={userRole}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MessagesHeader({
  activeUser,
  userRole,
  onOpenAppointmentModal,
  onShowSidebar,
  onShowUserListDrawer,
  users = []
}: {
  activeUser: User | null;
  userRole: "tutee" | "tutor";
  onOpenAppointmentModal: () => void;
  onShowSidebar: () => void;
  onShowUserListDrawer?: () => void;
  users?: any[];
}) {
  return (
    <div className="p-4 border-b border-black/30 flex justify-between items-center">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Button */}
        {onShowUserListDrawer && (
          <button
            onClick={onShowUserListDrawer}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors relative -ml-2"
          >
            <Menu className="w-6 h-6 text-gray-600" />
            {users.some((u: any) => u.unreadCount > 0) && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {users.reduce((total: number, u: any) => total + u.unreadCount, 0) > 99 ? '99+' : users.reduce((total: number, u: any) => total + u.unreadCount, 0)}
              </span>
            )}
          </button>
        )}
        
        {activeUser && (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {activeUser.imageUrl ? (
              <img
                src={activeUser.imageUrl}
                alt={activeUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-green-700 font-semibold text-xs">
                {activeUser.firstName?.charAt(0) || activeUser.name.charAt(0)}
                {activeUser.lastName?.charAt(0) || ""}
              </span>
            )}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-green-900 text-sm">
            {activeUser?.name ?? "Select a user"}
          </h3>
          {activeUser?.username && (
            <p className="text-xs text-gray-500">@{activeUser.username}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Tutor-only appointment button */}
        {userRole === "tutor" && activeUser && (
          <button
            onClick={onOpenAppointmentModal}
            title="Schedule appointment"
            className="p-2 text-green-700 hover:bg-green-100 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        )}
        <button
          onClick={onShowSidebar}
          className="xl:hidden p-2 text-green-700 hover:bg-green-100 rounded-full"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function NoActiveUserState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="mb-4">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        </div>
        <h4 className="text-lg font-semibold text-gray-600 mb-2">
          Select a conversation
        </h4>
        <p className="text-gray-400 text-sm">
          Choose a conversation from the list to start messaging.
        </p>
      </div>
    </div>
  );
}

function EmptyMessagesState({ activeUser }: { activeUser: User }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="mb-4">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        </div>
        <h4 className="text-lg font-semibold text-gray-600 mb-2">
          Start a conversation
        </h4>
        <p className="text-gray-400 text-sm mb-4">
          Send a message to {activeUser.name} to begin your conversation.
        </p>
        <div className="text-xs text-gray-300">
          Type your message below and press Enter
        </div>
      </div>
    </div>
  );
}