import { useEffect, useRef, useState } from 'react';

interface RealtimeMessage {
  type: 'connected' | 'new_message';
  message?: any;
  userId?: string;
  role?: string;
}

export function useRealtimeChat(userId: string | undefined, userRole: 'tutee' | 'tutor', onMessageReceived: (message: any) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!userId) return;

    setIsConnected(true);

    // Poll for new messages every 2 seconds
    const pollForMessages = async () => {
      try {
        const response = await fetch(`/api/chat/poll?userId=${userId}&role=${userRole}&since=${lastMessageTimeRef.current}`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            data.messages.forEach((message: any) => {
              onMessageReceived(message);
              // Update last message time
              if (message.timestamp > lastMessageTimeRef.current) {
                lastMessageTimeRef.current = message.timestamp;
              }
            });
          }
        }
      } catch (error) {
        console.error('Error polling for messages:', error);
        setIsConnected(false);
      }
    };

    // Start polling
    intervalRef.current = setInterval(pollForMessages, 2000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsConnected(false);
    };
  }, [userId, userRole, onMessageReceived]);

  const disconnect = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      setIsConnected(false);
    }
  };

  return { isConnected, disconnect };
}