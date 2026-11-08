import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket = null;

/**
 * Initialize Socket.IO client connection
 */
export const initSocketClient = (user = null) => {
    if (socket) return socket;

    // Derived socket host from API_BASE_URL (remove /api suffix)
    const socketHost = API_BASE_URL.replace(/\/api\/?$/, '');

    console.log(`⚡ [Socket.IO Client] Connecting to ${socketHost}...`);

    socket = io(socketHost, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
    });

    socket.on('connect', () => {
        console.log('⚡ [Socket.IO Client] Connected to real-time sync server!');
        if (user && user.id) {
            socket.emit('join_user', user.id);
        }
    });

    // Handle real-time data refresh event from backend
    socket.on('refresh_data', (payload) => {
        console.log('⚡ [Socket.IO Client] Received real-time refresh_data event:', payload);
        window.dispatchEvent(new Event('refreshData'));
    });

    socket.on('disconnect', () => {
        console.log('⚡ [Socket.IO Client] Disconnected from sync server.');
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
