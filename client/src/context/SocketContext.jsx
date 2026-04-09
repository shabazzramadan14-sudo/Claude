import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { user, provider } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socketRef.current.on('connect', () => {
      setConnected(true);
      // If logged-in provider, join their notification channel so followers'
      // live events reach them too
      if (provider) {
        socketRef.current.emit('joinProviderChannel', { providerId: provider._id });
      }
    });

    socketRef.current.on('disconnect', () => setConnected(false));

    return () => {
      socketRef.current?.disconnect();
    };
  }, [provider]);

  const joinStream = (streamId) => {
    socketRef.current?.emit('joinStream', { streamId, userId: user?._id });
  };

  const leaveStream = (streamId) => {
    socketRef.current?.emit('leaveStream', { streamId });
  };

  const sendChat = (streamId, message) => {
    socketRef.current?.emit('chatMessage', {
      streamId,
      userId: user?._id,
      username: user?.displayName || user?.username,
      message
    });
  };

  const on = (event, handler) => socketRef.current?.on(event, handler);
  const off = (event, handler) => socketRef.current?.off(event, handler);

  return (
    <SocketContext.Provider value={{ connected, joinStream, leaveStream, sendChat, on, off, socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
