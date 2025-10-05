import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

const ChatRoom = () => {
  const {
    messages,
    users,
    typingUsers,
    socket,
    currentUser,
    activeRoom,
    sendMessage,
    setTyping,
    changeRoom,
    isConnected,
    reactToMessage
  } = useSocket();

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [availableRooms] = useState(['general', 'random', 'tech', 'support']);
  const [showUserList, setShowUserList] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up typing indicators
  useEffect(() => {
    if (isTyping) {
      setTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTyping(false);
      }, 3000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, setTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const messageData = {
      text: newMessage.trim(),
      sender: currentUser.username,
      type: 'text'
    };

    sendMessage(messageData);
    setNewMessage('');
    setIsTyping(false);
    setTyping(false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
    }
  };

  const handleInputBlur = () => {
    setIsTyping(false);
    setTyping(false);
  };

  const handleRoomChange = (newRoom) => {
    if (newRoom !== activeRoom) {
      changeRoom(newRoom);
    }
  };

  const handleReaction = (messageId, reaction) => {
    reactToMessage(messageId, reaction);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (!currentUser) {
    return (
      <div className="chat-room-placeholder">
        <p>Please join a chat room to start messaging</p>
      </div>
    );
  }

  return (
    <div className="chat-room">
      {/* Header */}
      <div className="chat-header">
        <div className="room-info">
          <h2>#{activeRoom}</h2>
          <span className="user-count">{users.length} users online</span>
        </div>
        
        <div className="room-controls">
          <select 
            value={activeRoom} 
            onChange={(e) => handleRoomChange(e.target.value)}
            className="room-selector"
          >
            {availableRooms.map(room => (
              <option key={room} value={room}>
                #{room}
              </option>
            ))}
          </select>
          
          <button 
            onClick={() => setShowUserList(!showUserList)}
            className="user-list-toggle"
          >
            👥 {showUserList ? 'Hide' : 'Show'} Users
          </button>
        </div>
      </div>

      <div className="chat-content">
        {/* User List Sidebar */}
        {showUserList && (
          <div className="user-list-sidebar">
            <h3>Online Users ({users.length})</h3>
            <div className="user-list">
              {users.map(user => (
                <div key={user.id} className="user-item">
                  <span className="user-status"></span>
                  <span className="username">{user.username}</span>
                  {user.id === socket.id && <span className="you-badge">You</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="messages-area">
          <div className="messages-container">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date} className="message-group">
                <div className="date-divider">
                  <span>{date}</span>
                </div>
                {dateMessages.map((message) => (
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
                      ) : message.type === 'file' ? (
                        <div className="file-message">
                          <span>📎 {message.fileData.name}</span>
                          <small>({message.fileData.size} bytes)</small>
                        </div>
                      ) : (
                        message.text
                      )}
                    </div>
                    
                    {/* Message Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="message-reactions">
                        {message.reactions.map((reaction, index) => (
                          <span key={index} className="reaction">
                            {reaction.reaction}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Reaction Picker (for own messages) */}
                    {!message.system && message.senderId !== socket.id && (
                      <div className="reaction-picker">
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.id, emoji)}
                            className="reaction-button"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            
            {/* Typing Indicator */}
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

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="message-input-form">
            <div className="input-container">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder={`Message #${activeRoom}`}
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
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="connection-banner">
          <span>Reconnecting...</span>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;