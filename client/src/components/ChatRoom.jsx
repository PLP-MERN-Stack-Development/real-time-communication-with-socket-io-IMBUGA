// client/src/components/ChatRoom.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

const ChatRoom = () => {
  const {
    messages,
    users,
    typingUsers,
    currentUser,
    activeRoom,
    sendMessage,
    setTyping,
    switchRoom,
    isConnected,
    leaveRoom,
    reactToMessage,
    sendFile
  } = useSocket();

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [availableRooms, setAvailableRooms] = useState(['general', 'random', 'tech', 'support']);
  const [showUserList, setShowUserList] = useState(true);
  const [fileUploading, setFileUploading] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const fileInputRef = useRef(null);
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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
    if (!newMessage.trim() || !currentUser || !isConnected) {
      console.log('Cannot send message:', { hasText: !!newMessage.trim(), currentUser: !!currentUser, isConnected });
      return;
    }

    console.log('Sending message:', newMessage);
    
    const messageData = {
      text: newMessage.trim(),
      type: 'text'
    };

    const success = sendMessage(messageData);
    if (success) {
      setNewMessage('');
      setIsTyping(false);
      setTyping(false);
      console.log('Message sent successfully');
    } else {
      console.log('Failed to send message');
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (value.trim() && !isTyping) {
      setIsTyping(true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      setTyping(false);
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTyping(false);
      }, 3000);
    }
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleRoomChange = (newRoom) => {
    if (newRoom !== activeRoom) {
      switchRoom(newRoom);
      setNewMessage(''); // Clear input when switching rooms
    }
  };

  const handleLeaveChat = () => {
    leaveRoom();
    window.location.reload();
  };

  // File Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Maximum size is 10MB.');
      return;
    }

    setFileUploading(true);

    // Simulate file upload (in real app, upload to cloud storage)
    setTimeout(() => {
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file) // Temporary local URL
      };

      sendFile(fileData);
      setFileUploading(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 1000);
  };

  // Message Reaction Handler
  const handleReaction = (messageId, reaction) => {
    reactToMessage(messageId, reaction);
    setShowReactionPicker(null);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Reaction emojis
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

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

          <button 
            onClick={handleLeaveChat}
            className="logout-button"
            style={{ marginLeft: '1rem' }}
          >
            Leave Chat
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
                  {user.id === currentUser.id && <span className="you-badge">You</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="messages-area">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Start the conversation by sending a message!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id || message.tempId}
                  className={`message ${message.senderId === currentUser.id ? 'own-message' : ''} ${message.system ? 'system-message' : ''}`}
                  onDoubleClick={() => !message.system && setShowReactionPicker(message.id)}
                >
                  {!message.system && (
                    <div className="message-header">
                      <span className="message-sender">{message.sender}</span>
                      <span className="message-time">{formatTime(message.timestamp)}</span>
                      {message.readBy && message.readBy.length > 1 && (
                        <span className="read-receipt">👁️ {message.readBy.length - 1}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="message-content">
                    {message.system ? (
                      <em>{message.message}</em>
                    ) : message.type === 'file' ? (
                      <div className="file-message">
                        <div className="file-icon">
                          {message.fileData.type.startsWith('image/') ? '🖼️' : '📎'}
                        </div>
                        <div className="file-info">
                          <a href={message.fileData.url} target="_blank" rel="noopener noreferrer" className="file-name">
                            {message.fileData.name}
                          </a>
                          <div className="file-size">{formatFileSize(message.fileData.size)}</div>
                        </div>
                      </div>
                    ) : (
                      message.text
                    )}
                  </div>

                  {/* Message Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="message-reactions">
                      {Object.entries(
                        message.reactions.reduce((acc, reaction) => {
                          acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => (
                        <span key={emoji} className="reaction-bubble">
                          {emoji} {count > 1 ? count : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Reaction Picker */}
                  {showReactionPicker === message.id && (
                    <div className="reaction-picker-overlay">
                      <div className="reaction-picker">
                        {reactionEmojis.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.id, emoji)}
                            className="reaction-option"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
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
              {/* File Upload Button */}
              <button 
                type="button" 
                className="file-upload-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={fileUploading}
                title="Upload file"
              >
                {fileUploading ? '📤' : '📎'}
              </button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleInputKeyPress}
                placeholder={`Message #${activeRoom}... (Press Enter to send)`}
                className="message-input"
                disabled={!isConnected}
              />
              
              <button 
                type="submit" 
                disabled={!newMessage.trim() || !isConnected}
                className="send-button"
                title="Send message"
              >
                {!isConnected ? '🔌' : '➤'}
              </button>
            </div>
            
            {fileUploading && (
              <div className="upload-progress">
                <span>Uploading file...</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="connection-banner">
          <span>Reconnecting to server...</span>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;