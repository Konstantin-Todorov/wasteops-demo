import { io } from 'socket.io-client';

export const socket = io('/', { autoConnect: false });

export function connectSocket() {
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}
