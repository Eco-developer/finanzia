'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface SessionSocketOptions {
  enabled?: boolean;
  onSessionRevoked?: (data: { reason?: string; timestamp?: string }) => void;
  onAllSessionsRevoked?: (data: { reason?: string; timestamp?: string }) => void;
  onTokenExpiring?: (data: { message?: string }) => void;
}

export function useSessionSocket(options: SessionSocketOptions = {}) {
  const {
    enabled = true,
    onSessionRevoked,
    onAllSessionsRevoked,
    onTokenExpiring,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const getWsUrl = useCallback(() => {
    const customUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (customUrl) return customUrl;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}/ws/session`;
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('finanzia_token');
    const wsUrl = getWsUrl();

    const socket = io(wsUrl, {
      withCredentials: true,
      auth: {
        token: token || undefined,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('session:revoked', (data) => {
      onSessionRevoked?.(data);
    });

    socket.on('session:revoked_all', (data) => {
      onAllSessionsRevoked?.(data);
    });

    socket.on('session:token_expiring', (data) => {
      onTokenExpiring?.(data);
    });

    // Heartbeat periódico (Keep-Alive) cada 60 segundos
    const heartbeatInterval = setInterval(() => {
      if (socket.connected && document.visibilityState === 'visible') {
        socket.emit('session:ping');
      }
    }, 60000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, getWsUrl, onSessionRevoked, onAllSessionsRevoked, onTokenExpiring]);

  const ping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('session:ping');
    }
  }, []);

  return {
    isConnected,
    ping,
  };
}
