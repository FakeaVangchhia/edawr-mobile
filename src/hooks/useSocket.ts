import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';

type SocketInstance = {
  on: (event: string, listener: (...args: any[]) => void) => void;
  off: (event: string, listener?: (...args: any[]) => void) => void;
  disconnect: () => void;
};

export const useSocket = () => {
  const socketRef = useRef<SocketInstance | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socketRef.current) {
      const { io } = require('socket.io-client');
      socketRef.current = io(API_URL, {
        transports: ['websocket'],
      });
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket: socketRef.current, isConnected };
};
