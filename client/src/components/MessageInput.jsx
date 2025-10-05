import React, { useState, useRef } from 'react';
import { useSocket } from '../context/useSocketHook';

const MessageInput = () => {
  const [newMessage, setNewMessage] = useState('');
  const { sendMessage, setTyping, isConnected } = useSocket();
  const typingTimeoutRef = useRef(null);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    sendMessage({ text: newMessage.trim() });
    setNewMessage('');
    setTyping(false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    setTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  };

  return (
    <form onSubmit={handleSendMessage} className="message-input-form">
      <div className="input-container">
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="message-input"
          disabled={!isConnected}
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim() || !isConnected}
          className="send-button"
        >
          Send
        </button>
      </div>
    </form>
  );
};

export default MessageInput;