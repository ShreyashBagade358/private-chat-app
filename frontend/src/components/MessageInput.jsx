import React, { useState, useRef, useCallback } from 'react';
import '../styles/MessageInput.css';

function MessageInput({ onSendMessage, onSendMedia, onTyping, disabled }) {
  const [message, setMessage] = useState('');
  const [isTypingTimeout, setIsTypingTimeout] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const isProcessingFile = useRef(false);
  
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    
    // Notify typing
    onTyping(true);
    
    // Clear previous timeout
    if (isTypingTimeout) {
      clearTimeout(isTypingTimeout);
    }
    
    // Set new timeout to stop typing indicator
    const timeout = setTimeout(() => {
      onTyping(false);
    }, 1000);
    
    setIsTypingTimeout(timeout);
  };
  
  const handleAttachClick = useCallback(() => {
    if (!disabled && !isUploading && !isProcessingFile.current && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isUploading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      onTyping(false);
      if (isTypingTimeout) {
        clearTimeout(isTypingTimeout);
      }
    }
  };
  
  const handleFileSelect = useCallback((e) => {
    // Prevent double-clicks or multiple rapid selections
    if (isProcessingFile.current) {
      e.target.value = '';
      return;
    }

    const file = e.target.files[0];
    if (!file) {
      e.target.value = '';
      return;
    }

    try {
      isProcessingFile.current = true;

      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        e.target.value = '';
        isProcessingFile.current = false;
        return;
      }

      setIsUploading(true);

      // Read file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const mediaData = event.target.result;
          if (mediaData && typeof mediaData === 'string') {
            onSendMedia(mediaData, file.type || 'application/octet-stream', file.name, file.size);
          } else {
            alert('Error: Invalid file data');
          }
        } catch (error) {
          console.error('Error processing file:', error);
          alert('Error processing file. Please try again.');
        } finally {
          setIsUploading(false);
          isProcessingFile.current = false;
          e.target.value = '';
        }
      };
      reader.onerror = () => {
        alert('Error reading file. Please try again.');
        setIsUploading(false);
        isProcessingFile.current = false;
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
      alert('An error occurred. Please try again.');
      setIsUploading(false);
      isProcessingFile.current = false;
      e.target.value = '';
    }
  }, [onSendMedia]);
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <div className="message-input">
      {isUploading && (
        <div className="upload-indicator">
          <span className="upload-spinner"></span>
          <span>Uploading file...</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="input-form">
        <button
          type="button"
          className="attach-btn"
          onClick={handleAttachClick}
          disabled={disabled || isUploading}
          title="Attach any file"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        <textarea
          className="message-textarea"
          value={message}
          onChange={handleMessageChange}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? "Waiting for other user to join..." : isUploading ? "Uploading file..." : "Type a message..."}
          disabled={disabled || isUploading}
          rows={1}
        />
        
        <button
          type="submit"
          className="send-btn"
          disabled={!message.trim() || disabled}
          title="Send message"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
      
      {disabled && (
        <div className="input-disabled-overlay">
          <span>Waiting for another user to join...</span>
        </div>
      )}
    </div>
  );
}

export default MessageInput;
