import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import CallInterface from './CallInterface';
import '../styles/ChatRoom.css';

function ChatRoom({ socket, sessionCode, messages, userCount, onSendMessage, onSendMedia, onTyping }) {
  const [isTyping, setIsTyping] = useState(false);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' or 'video'
  const [incomingCall, setIncomingCall] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('user-typing', ({ isTyping }) => {
      setIsTyping(isTyping);
    });
    
    socket.on('incoming-call', ({ offer, callType, from }) => {
      setIncomingCall({ offer, callType, from });
    });
    
    socket.on('call-answered', async ({ answer }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });
    
    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnection.current && candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
    
    socket.on('call-ended', () => {
      endCall();
    });
    
    return () => {
      socket.off('user-typing');
      socket.off('incoming-call');
      socket.off('call-answered');
      socket.off('ice-candidate');
      socket.off('call-ended');
    };
  }, [socket]);
  
  const copySessionCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const initializeCall = async (type) => {
    try {
      setCallType(type);
      setShowCallInterface(true);
      
      const constraints = {
        audio: true,
        video: type === 'video'
      };
      
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      localStream.current.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream.current);
      });
      
      peerConnection.current.ontrack = (event) => {
        remoteStream.current = event.streams[0];
      };
      
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate });
        }
      };
      
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      socket.emit('call-user', { offer, callType: type });
    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Could not access camera/microphone. Please check permissions.');
      endCall();
    }
  };
  
  const answerCall = async () => {
    try {
      setCallType(incomingCall.callType);
      setShowCallInterface(true);
      
      const constraints = {
        audio: true,
        video: incomingCall.callType === 'video'
      };
      
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      localStream.current.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream.current);
      });
      
      peerConnection.current.ontrack = (event) => {
        remoteStream.current = event.streams[0];
      };
      
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate });
        }
      };
      
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      socket.emit('answer-call', { answer });
      setIncomingCall(null);
    } catch (error) {
      console.error('Error answering call:', error);
      alert('Could not access camera/microphone. Please check permissions.');
      endCall();
    }
  };
  
  const declineCall = () => {
    setIncomingCall(null);
    socket.emit('end-call');
  };
  
  const endCall = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    remoteStream.current = null;
    setShowCallInterface(false);
    setCallType(null);
    
    socket.emit('end-call');
  };
  
  return (
    <div className="chat-room">
      <div className="chat-header">
        <div className="header-left">
          <div className="session-info">
            <div className="session-code-display">
              <span className="code-label">Session Code:</span>
              <code className="code-value">{sessionCode}</code>
              <button 
                className="copy-btn" 
                onClick={copySessionCode}
                title="Copy code"
              >
                {copied ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
            <div className="user-status">
              <div className={`status-indicator ${userCount === 2 ? 'active' : 'waiting'}`}></div>
              <span>{userCount === 2 ? 'Both users online' : 'Waiting for user...'}</span>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <button 
            className="icon-btn audio-call-btn" 
            onClick={() => initializeCall('audio')}
            disabled={userCount < 2 || showCallInterface}
            title="Audio call"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          
          <button 
            className="icon-btn video-call-btn" 
            onClick={() => initializeCall('video')}
            disabled={userCount < 2 || showCallInterface}
            title="Video call"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
      
      {showCallInterface && (
        <CallInterface
          callType={callType}
          localStream={localStream.current}
          remoteStream={remoteStream.current}
          onEndCall={endCall}
        />
      )}
      
      {incomingCall && (
        <div className="incoming-call-modal">
          <div className="modal-content">
            <div className="call-icon">
              {incomingCall.callType === 'video' ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                </svg>
              )}
            </div>
            <h3>Incoming {incomingCall.callType} call</h3>
            <div className="call-actions">
              <button className="decline-btn" onClick={declineCall}>
                Decline
              </button>
              <button className="accept-btn" onClick={answerCall}>
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
      
      <MessageList messages={messages} isTyping={isTyping} />
      
      <MessageInput
        onSendMessage={onSendMessage}
        onSendMedia={onSendMedia}
        onTyping={onTyping}
        disabled={userCount < 2}
      />
    </div>
  );
}

export default ChatRoom;
