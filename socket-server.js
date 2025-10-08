const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer((req, res) => {
  // Handle broadcast endpoint for API calls
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        console.log('Broadcasting message from API:', message);
        
        // Broadcast to all recipients
        if (message.recipients && Array.isArray(message.recipients)) {
          message.recipients.forEach(recipientId => {
            // Send to both tutee and tutor connections of the recipient
            const tuteeConnection = userConnections.get(`${recipientId}_tutee`);
            const tutorConnection = userConnections.get(`${recipientId}_tutor`);
            
            if (tuteeConnection) {
              console.log('Broadcasting to tutee connection:', recipientId);
              io.to(tuteeConnection).emit('new_message', message);
            }
            
            if (tutorConnection) {
              console.log('Broadcasting to tutor connection:', recipientId);
              io.to(tutorConnection).emit('new_message', message);
            }
          });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Error broadcasting message:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const CORS_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// Store user connections
const userConnections = new Map();

io.on('connection', (socket) => {
  const { userId, role } = socket.handshake.query;

  // Store the connection
  if (userId && role) {
    const connectionKey = `${userId}_${role}`;
    userConnections.set(connectionKey, socket.id);
  }

  // Handle joining room
  socket.on('join_room', (data) => {
    const { userId, role } = data;
    const roomName = `user_${userId}_${role}`;
    socket.join(roomName);
  });

  // Handle sending messages
  socket.on('send_message', (message) => {
    console.log('Received message to broadcast:', message);
    
    // Broadcast to all recipients (including sender for appointment updates)
    if (message.recipients && Array.isArray(message.recipients)) {
      message.recipients.forEach(recipientId => {
        // Send to both tutee and tutor connections of the recipient
        const tuteeConnection = userConnections.get(`${recipientId}_tutee`);
        const tutorConnection = userConnections.get(`${recipientId}_tutor`);
        
        if (tuteeConnection) {
          console.log('Sending to tutee connection:', recipientId);
          io.to(tuteeConnection).emit('new_message', message);
        }
        
        if (tutorConnection) {
          console.log('Sending to tutor connection:', recipientId);
          io.to(tutorConnection).emit('new_message', message);
        }
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    
    // Remove from connections map
    for (const [key, socketId] of userConnections.entries()) {
      if (socketId === socket.id) {
        userConnections.delete(key);
        break;
      }
    }
      });
});

const PORT = process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`CORS enabled for: ${CORS_ORIGIN}`);
});

module.exports = { io };