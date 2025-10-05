import React, { useEffect, useRef } from 'react';
import { useSocket } from '../context/useSocketHook';

const MessageList = () => {
  const { messages, typingUsers, socket } = useSocket();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="messages-container">
      {messages.map((message) => (
        <div
          key={message.id || message.tempId}
          className={`message ${message.senderId === socket.id ? 'own-message' : ''} ${message.system ? 'system-message' : ''}`}
        >
          {!message.system && (
            <div className="message-header">
              <span className="message-sender">{message.sender}</span>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
          )}
          <div className="message-content">
            {message.system ? (
              <em>{message.message}</em>
            ) : message.text}
          </div>
        </div>
      ))}
      
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="typing-text">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;