import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (message: any) => void;
}

export function useSocket(userId: string | undefined, userRole: 'tutee' | 'tutor', onMessageReceived: (message: any) => void): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Initialize Socket.IO connection
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      query: {
        userId,
        role: userRole
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      
      // Join room based on user ID and role
      socket.emit('join_room', { userId, role: userRole });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new_message', (message) => {
      console.log('Socket received new_message:', message);
      onMessageReceived(message);
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      setIsConnected(false);
    };
  }, [userId, userRole, onMessageReceived]);

  const sendMessage = (message: any) => {
    console.log('Socket sendMessage called:', { message, isConnected });
    if (socketRef.current && isConnected) {
      console.log('Emitting send_message via socket');
      socketRef.current.emit('send_message', message);
    } else {
      console.log('Cannot send - socket not connected');
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage
  };
}