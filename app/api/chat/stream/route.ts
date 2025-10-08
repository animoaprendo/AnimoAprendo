import { NextRequest } from 'next/server';

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const role = searchParams.get('role');

  if (!userId || !role) {
    console.log('Missing userId or role');
    return new Response('userId and role are required', { status: 400 });
  }


  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Store connection for this user/role combination
      const connectionId = `${userId}_${role}`;
      
      // Send initial connection message
      const initMessage = `data: ${JSON.stringify({ type: 'connected', userId, role })}\n\n`;
      controller.enqueue(encoder.encode(initMessage));

      // Store the controller so we can send messages later
      connections.set(connectionId, controller);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        connections.delete(connectionId);
        try {
          controller.close();
        } catch (e) {
          console.log('Error closing controller:', e);
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}