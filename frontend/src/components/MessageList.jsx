import React, { useEffect, useRef } from 'react';
import '../styles/MessageList.css';

function MessageList({ messages, isTyping }) {
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const renderMessage = (msg, index) => {
    if (msg.type === 'system') {
      return (
        <div key={index} className="system-message">
          <span>{msg.text || msg.message}</span>
        </div>
      );
    }
    
    if (msg.type === 'text') {
      return (
        <div key={index} className={`message ${msg.isMine ? 'mine' : 'theirs'}`}>
          <div className="message-content">
            <p>{msg.text || msg.message}</p>
          </div>
          <div className="message-time">{formatTime(msg.timestamp)}</div>
        </div>
      );
    }
    
    if (msg.type === 'media') {
      const mediaType = msg.mediaType.split('/')[0];
      
      return (
        <div key={index} className={`message media-message ${msg.isMine ? 'mine' : 'theirs'}`}>
          <div className="message-content">
            {mediaType === 'image' && (
              <div className="media-container image-container">
                <img src={msg.mediaData} alt={msg.fileName} />
              </div>
            )}
            
            {mediaType === 'video' && (
              <div className="media-container video-container">
                <video controls>
                  <source src={msg.mediaData} type={msg.mediaType} />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            
            {mediaType === 'audio' && (
              <div className="media-container audio-container">
                <audio controls>
                  <source src={msg.mediaData} type={msg.mediaType} />
                  Your browser does not support the audio element.
                </audio>
                <div className="file-info">
                  <span className="file-name">{msg.fileName}</span>
                </div>
              </div>
            )}
            
            {(mediaType === 'application' || !['image', 'video', 'audio'].includes(mediaType)) && (
              <div className="media-container file-container">
                <div className="file-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <div className="file-info">
                  <span className="file-name">{msg.fileName}</span>
                  <span className="file-size">{formatFileSize(msg.fileSize)}</span>
                </div>
                <a 
                  href={msg.mediaData} 
                  download={msg.fileName}
                  className="download-btn"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            )}
          </div>
          <div className="message-time">{formatTime(msg.timestamp)}</div>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3>No messages yet</h3>
          <p>Start the conversation by sending a message</p>
        </div>
      ) : (
        messages.map((msg, index) => renderMessage(msg, index))
      )}
      
      {isTyping && (
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
