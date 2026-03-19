// lib/socket.ts — Socket.IO client (singleton)
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}

// ── Typed event helpers ───────────────────────────────────────
export interface NewOrderEvent   { orderId: string; orderNumber: string; }
export interface StatusUpdateEvent { orderId: string; status: string; }

export type SocketEventMap = {
  new_order:          NewOrderEvent;
  order_status_update:StatusUpdateEvent;
  connect:            void;
  disconnect:         void;
  connect_error:      Error;
};
