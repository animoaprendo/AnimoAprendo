"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PolledMessage = {
  _id?: string;
  id?: string;
  creatorId?: string;
  message?: string;
  type?: string;
  createdAt?: string;
  timestamp?: number;
};

const POLL_INTERVAL_MS = 3000;

const normalizeId = (id?: string) => {
  if (!id) return "";
  return id.startsWith("user_") ? id.replace("user_", "") : id;
};

const isSupportedRole = (role: unknown): role is "tutee" | "tutor" => {
  return role === "tutee" || role === "tutor";
};

const getMessageUniqueId = (message: PolledMessage) => {
  return (
    message._id ||
    message.id ||
    `${message.creatorId || "unknown"}-${message.createdAt || message.timestamp || Date.now()}-${message.message || ""}`
  );
};

const getMessageTime = (message: PolledMessage) => {
  if (typeof message.timestamp === "number") return message.timestamp;
  if (message.createdAt) {
    const parsed = new Date(message.createdAt).getTime();
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }
  return Date.now();
};

export default function GlobalMessageNotifications() {
  const { isLoaded, isSignedIn, user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const lastMessageTimeRef = useRef<number>(Date.now());
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;

    const roleValue = (user.publicMetadata as Record<string, unknown> | undefined)?.role;
    if (!isSupportedRole(roleValue)) return;

    // Keep chat-page notifications scoped to ChatContainer to avoid duplicate toasts.
    const isOnChatPage = pathname?.includes("/chat");
    if (isOnChatPage) return;

    const userId = user.id;
    const userRole = roleValue;

    const pollForMessages = async () => {
      try {
        const response = await fetch(
          `/api/chat/poll?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(userRole)}&since=${lastMessageTimeRef.current}`,
          { method: "GET" }
        );

        if (!response.ok || response.redirected) return;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;

        const data = await response.json();
        const messages: PolledMessage[] = Array.isArray(data?.messages)
          ? data.messages
          : [];

        // TEMP DEBUG: Remove after verifying cross-page notifications.
        console.log("[GlobalMessageNotifications] polled messages:", messages.length);

        if (messages.length === 0) return;

        for (const message of messages) {
          const uniqueId = getMessageUniqueId(message);
          if (seenMessageIdsRef.current.has(uniqueId)) continue;
          seenMessageIdsRef.current.add(uniqueId);

          if (seenMessageIdsRef.current.size > 200) {
            seenMessageIdsRef.current.clear();
            seenMessageIdsRef.current.add(uniqueId);
          }

          const messageTime = getMessageTime(message);
          if (messageTime > lastMessageTimeRef.current) {
            lastMessageTimeRef.current = messageTime;
          }

          const isOwnMessage = normalizeId(message.creatorId) === normalizeId(userId);
          if (isOwnMessage) continue;

          const senderId = normalizeId(message.creatorId);
          if (!senderId) continue;

          const fallbackText =
            message.type === "appointment"
              ? "Sent an appointment update"
              : "Sent you a new message";
          const rawPreview =
            typeof message.message === "string" && message.message.trim().length > 0
              ? message.message.trim()
              : fallbackText;
          const preview = rawPreview.length > 90 ? `${rawPreview.slice(0, 90)}...` : rawPreview;

          const destination =
            userRole === "tutor" ? `/tutor/chat/${senderId}` : `/chat/${senderId}`;

          const openConversation = () => {
            router.push(destination);
          };

          toast.custom((t) => (
            <div className="pointer-events-auto w-full max-w-sm rounded-lg border bg-background p-4 shadow-md">
              <div className="space-y-2">
                <p className="text-sm font-semibold">New message</p>
                <p className="text-sm text-muted-foreground">{preview}</p>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      openConversation();
                      toast.dismiss(t);
                    }}
                  >
                    Open
                  </Button>
                </div>
              </div>
            </div>
          ));
        }
      } catch (error) {
        console.error("Global message poll failed:", error);
      }
    };

    const timer = setInterval(pollForMessages, POLL_INTERVAL_MS);
    pollForMessages();

    return () => {
      clearInterval(timer);
    };
  }, [isLoaded, isSignedIn, user, pathname, router]);

  return null;
}
