const { Server } = require('socket.io');
const { isOriginAllowed } = require('../config/cors');

let io = null;

/**
 * Initialize Socket.IO server attached to HTTP server
 */
const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (isOriginAllowed(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`⚡ [Socket.IO] Client connected: ${socket.id}`);

        // Join user-specific channel if user ID is sent
        socket.on('join_user', (userId) => {
            if (userId) {
                const room = `user_${userId}`;
                socket.join(room);
                console.log(`⚡ [Socket.IO] Socket ${socket.id} joined room ${room}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`⚡ [Socket.IO] Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
    if (!io) {
        console.warn('⚠️ [Socket.IO] io instance accessed before initialization');
    }
    return io;
};

/**
 * Notify a specific user of a real-time data change
 */
const notifyUser = (userId, event, payload = {}) => {
    if (io && userId) {
        io.to(`user_${userId}`).emit(event, payload);
    }
    // Also broadcast globally as fallback
    if (io) {
        io.emit(event, payload);
    }
};

/**
 * Broadcast real-time data sync to all connected clients
 */
const broadcastSync = (event = 'refresh_data', payload = {}) => {
    if (io) {
        io.emit(event, payload);
    }
};

module.exports = {
    initSocket,
    getIO,
    notifyUser,
    broadcastSync
};
