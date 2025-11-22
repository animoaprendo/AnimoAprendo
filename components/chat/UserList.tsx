"use client";

import { Search } from "lucide-react";
import { User } from "./types";

interface UserListProps {
  users: User[];
  activeUser: User | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onUserSelect: (user: User) => void;
  userId: string;
  className?: string;
}

export default function UserList({
  users,
  activeUser,
  searchTerm,
  setSearchTerm,
  onUserSelect,
  userId,
  className = "bg-white h-full rounded-2xl shadow p-4 grow flex flex-col col-span-1 overflow-y-auto",
}: UserListProps) {
  const filteredUsers = users
    .filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      // Sort by most recent message time, fallback to unread count if no timestamps
      if (a.lastMessageTime && b.lastMessageTime) {
        return (
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
        );
      }
      // Fallback sorting: unread messages first, then by name
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
      <div className="overflow-y-auto space-y-2">
        {filteredUsers.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            isActive={activeUser?.id === user.id}
            onClick={() => onUserSelect(user)}
            userId={userId}
          />
        ))}
      </div>
    </div>
  );
}

function UserCard({
  user,
  isActive,
  onClick,
  userId,
}: {
  user: User;
  isActive: boolean;
  onClick: () => void;
  userId: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl cursor-pointer transition ${
        isActive
          ? "bg-green-50 border border-green-200"
          : user.unreadCount > 0
            ? "hover:bg-blue-50 bg-blue-50/30 border border-blue-200"
            : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-green-700 font-semibold text-xs">
              {user.firstName?.charAt(0) || user.name.charAt(0)}
              {user.lastName?.charAt(0) || ""}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 text-sm truncate">
              {user.name}
            </h4>
            <div className="flex items-center gap-2">
              {user.lastMessageTime && (
                <span className="text-xs text-gray-400">
                  {formatTime(user.lastMessageTime)}
                </span>
              )}
              {user.unreadCount > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {user.unreadCount > 99 ? "99+" : user.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {user.isTyping ? (
        <TypingIndicator />
      ) : (
        <p
          className={`text-xs truncate ${
            user.unreadCount > 0
              ? "text-gray-800 font-semibold"
              : "text-gray-500"
          }`}
        >
          {user.lastMessageCreatorId === userId && "You: "}
          {user.lastMessage}
        </p>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <p className="text-xs text-green-600 mt-1 animate-pulse flex flex-row">
      Typing
      <div className="animate-bounce [animation-delay:0ms] [animation-iteration-count:infinite] [animation-timing-function:ease-in-out] [animation-name:bounce15]">
        .
      </div>
      <div className="animate-bounce [animation-delay:75ms] [animation-iteration-count:infinite] [animation-timing-function:ease-in-out] [animation-name:bounce15]">
        .
      </div>
      <div className="animate-bounce [animation-delay:150ms] [animation-iteration-count:infinite] [animation-timing-function:ease-in-out] [animation-name:bounce15]">
        .
      </div>
      <style jsx global>{`
        @keyframes bounce15 {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15%);
          }
        }
      `}</style>
    </p>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if it's today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // Check if it's within the last week
  const daysDiff = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  // For older messages, show the date
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
