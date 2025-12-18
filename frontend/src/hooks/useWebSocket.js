import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const { 
    reconnectInterval = 3000, 
    autoConnect = true,
    onMessage,
    onOpen,
    onClose,
    onError
  } = options;

  const connect = useCallback(() => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) return;

      // URL에 토큰 추가 (필요한 경우)
      const token = localStorage.getItem('token');
      const wsUrl = token && !url.includes('token=') 
        ? `${url}?token=${token}` 
        : url;

      // 개발 환경에서 wss 대신 ws 사용, 프록시 설정 고려
      // const finalUrl = wsUrl.startsWith('/') 
      //   ? `ws://${window.location.host}${wsUrl}` 
      //   : wsUrl;
      // * setupProxy.js 또는 vite.config.js에서 ws 프록시가 설정되어 있다고 가정하거나
      // * 전체 URL을 받아야 함. 일단 입력받은 URL 그대로 사용.
      
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = (event) => {
        console.log('WebSocket Connected');
        setIsConnected(true);
        setError(null);
        if (onOpen) onOpen(event);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket Disconnected', event.code, event.reason);
        setIsConnected(false);
        if (onClose) onClose(event);

        // 자동 재연결
        if (autoConnect && event.code !== 1000) {
          reconnectTimeout.current = setTimeout(() => {
            console.log('Reconnecting WebSocket...');
            connect();
          }, reconnectInterval);
        }
      };

      ws.current.onerror = (event) => {
        console.error('WebSocket Error', event);
        setError(event);
        if (onError) onError(event);
      };

      ws.current.onmessage = (event) => {
        const message = event.data;
        // JSON 파싱 시도
        try {
          const parsed = JSON.parse(message);
          setLastMessage(parsed);
          if (onMessage) onMessage(parsed);
        } catch (e) {
          setLastMessage(message);
          if (onMessage) onMessage(message);
        }
      };

    } catch (err) {
      console.error('WebSocket Connection Failed:', err);
      setError(err);
    }
  }, [url, reconnectInterval, autoConnect, onMessage, onOpen, onClose, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close(1000, 'User initiated disconnect');
      ws.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      if (typeof message === 'object' && !(message instanceof Blob) && !(message instanceof ArrayBuffer)) {
        ws.current.send(JSON.stringify(message));
      } else {
        ws.current.send(message);
      }
    } else {
      console.warn('WebSocket is not connected. Message not sent.');
    }
  }, []);

  useEffect(() => {
    if (autoConnect && url) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [url, autoConnect, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    error
  };
};

export default useWebSocket;

