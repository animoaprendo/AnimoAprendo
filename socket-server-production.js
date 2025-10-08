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
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Error broadcasting message:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } else if (req.method === 'OPTIONS') {
    // Handle preflight requests
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
  } else if (req.method === 'GET' && req.url === '/health') {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

// Allow multiple origins for production
const allowedOrigins = [
  process.env.NEXT_PUBLIC_BASE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  'http://localhost:3000',
  'http://localhost:3002',
  'https://animoaprendo.vercel.app',
  'https://animoaprendo.com',
  'https://www.animoaprendo.com',
  // Add wildcard support for all animoaprendo subdomains
  /^https:\/\/.*\.animoaprendo\.com$/,
  /^https:\/\/animoaprendo\.com$/
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list or matches patterns
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store user connections
const userConnections = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  const { userId, role } = socket.handshake.query;

  // Store the connection
  if (userId && role) {
    const connectionKey = `${userId}_${role}`;
    userConnections.set(connectionKey, socket.id);
    console.log(`User ${userId} (${role}) connected with socket ${socket.id}`);
  }

  // Handle joining room
  socket.on('join_room', (data) => {
    const { userId, role } = data;
    const roomName = `user_${userId}_${role}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room ${roomName}`);
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
  socket.on('disconnect', (reason) => {
    console.log(`Socket ${socket.id} disconnected: ${reason}`);
    
    // Remove from connections map
    for (const [key, socketId] of userConnections.entries()) {
      if (socketId === socket.id) {
        userConnections.delete(key);
        console.log(`Removed user connection: ${key}`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`CORS enabled for origins:`, allowedOrigins);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { io };