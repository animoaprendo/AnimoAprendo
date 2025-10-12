"use client";

import { Send, CornerUpLeft } from "lucide-react";
import { Message, getMessageId } from "./types";
import { useRef, useImperativeHandle, forwardRef } from "react";

interface ChatInputProps {
  newMessage: string;
  setNewMessage: (value: string) => void;
  activeUser: any;
  replyTo: string | null;
  setReplyTo: (value: string | null) => void;
  messages: Message[];
  onSend: () => void;
  pendingMessages: Set<string>;
  disabled?: boolean;
}

export interface ChatInputRef {
  focus: () => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({
  newMessage,
  setNewMessage,
  activeUser,
  replyTo,
  setReplyTo,
  messages,
  onSend,
  pendingMessages,
  disabled = false
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <>
      {replyTo && (
        <div className="p-2 bg-green-50 border-t text-xs flex items-center justify-between">
          <span>
            Replying to:{" "}
            <span className="font-semibold">
              {messages.find((m) => getMessageId(m) === replyTo)?.message ??
                "Message not found"}
            </span>
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="text-green-700 font-semibold hover:cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {activeUser && activeUser.isTyping && (
        <p className="text-xs text-green-800 mt-1 flex flex-row gap-1 p-2">
          {activeUser.name} is typing
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
      )}

      <div className="p-3 border-t border-black/30 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder={
            activeUser ? "Aa" : "Select a conversation to start messaging"
          }
          value={newMessage}
          disabled={!activeUser || disabled}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`flex-1 rounded-full px-3 py-2 text-sm outline-none transition ${
            activeUser && !disabled
              ? "bg-green-50 focus:ring-2 focus:ring-green-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        />
        <button
          onClick={onSend}
          disabled={!activeUser || disabled}
          className={`p-2 rounded-full flex items-center justify-center transition ${
            activeUser && !disabled
              ? "bg-green-700 hover:bg-green-800 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {pendingMessages.size > 0 ? (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <Send className="w-4 h-4" />
            </div>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </>
  );
});

ChatInput.displayName = "ChatInput";
export default ChatInput;