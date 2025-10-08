import { NextRequest } from 'next/server';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

type NextApiResponseServerIO = {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

let io: SocketIOServer;

export async function GET(req: NextRequest) {
  console.log('Socket.IO route accessed');
  
  // We can't directly access the server from API routes in Next.js 13+
  // So we'll return a success response and handle Socket.IO elsewhere
  return new Response('Socket.IO endpoint', { 
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    }
  });
}

export async function POST(req: NextRequest) {
  // Handle Socket.IO initialization if needed
  return new Response('Socket.IO POST', { status: 200 });
}