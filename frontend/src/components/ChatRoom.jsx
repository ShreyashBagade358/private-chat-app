import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import CallInterface from './CallInterface';
import '../styles/ChatRoom.css';

function ChatRoom({ 
  socket, 
  sessionCode, 
  messages, 
  userCount, 
  onSendMessage, 
  onSendMedia, 
  onTyping,
  onLeaveSession,
  selectedContact,
  connected,
  error,
  onDismissError
}) {
  const [isTyping, setIsTyping] = useState(false);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' or 'video'
  const [incomingCall, setIncomingCall] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'calling', 'ringing', 'connected'
  
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const callTimeoutRef = useRef(null);
  const ringtoneRef = useRef(null);
  
  // Create ringtone audio element
  useEffect(() => {
    // Simple ringtone using Web Audio API oscillator
    ringtoneRef.current = {
      audioContext: null,
      oscillator: null,
      gainNode: null,
      play: function() {
        try {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          this.oscillator = this.audioContext.createOscillator();
          this.gainNode = this.audioContext.createGain();
          
          this.oscillator.connect(this.gainNode);
          this.gainNode.connect(this.audioContext.destination);
          
          this.oscillator.frequency.value = 800;
          this.oscillator.type = 'sine';
          this.gainNode.gain.value = 0.3;
          
          // Ring pattern: 1 second on, 1 second off
          let isPlaying = true;
          const interval = setInterval(() => {
            if (this.gainNode) {
              this.gainNode.gain.value = isPlaying ? 0 : 0.3;
              isPlaying = !isPlaying;
            }
          }, 1000);
          
          this.oscillator.start();
          this.intervalId = interval;
        } catch (e) {
          console.error('Could not play ringtone:', e);
        }
      },
      stop: function() {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        if (this.oscillator) {
          this.oscillator.stop();
          this.oscillator = null;
        }
        if (this.audioContext) {
          this.audioContext.close();
          this.audioContext = null;
        }
      }
    };
    
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
      }
    };
  }, []);
  
  const endCall = useCallback(() => {
    // Stop ringtone if playing
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    
    // Clear any pending timeouts
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    
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
    setCallStatus('idle');
    setIncomingCall(null);
    
    if (socket) {
      socket.emit('end-call');
    }
  }, [socket]);
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('user-typing', ({ isTyping }) => {
      setIsTyping(isTyping);
    });
    
    socket.on('incoming-call', ({ offer, callType, from }) => {
      // If already in a call, reject the new call
      if (showCallInterface || incomingCall) {
        socket.emit('reject-call');
        return;
      }
      setIncomingCall({ offer, callType, from });
      // Play ringtone for incoming call
      if (ringtoneRef.current) {
        ringtoneRef.current.play();
      }
    });
    
    socket.on('call-answered', async ({ answer }) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });
    
    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnection.current && candidate) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });
    
    socket.on('call-ended', () => {
      endCall();
    });
    
    socket.on('call-rejected', () => {
      alert('Call was declined');
      endCall();
    });
    
    return () => {
      socket.off('user-typing');
      socket.off('incoming-call');
      socket.off('call-answered');
      socket.off('ice-candidate');
      socket.off('call-ended');
      socket.off('call-rejected');
      endCall();
    };
  }, [socket, endCall, showCallInterface, incomingCall]);
  
  const initializeCall = async (type) => {
    try {
      setCallType(type);
      setCallStatus('calling');
      setShowCallInterface(true);
      
      const constraints = {
        audio: true,
        video: type === 'video'
      };
      
      // Check permissions first
      const permissionStatus = await navigator.permissions.query({ name: type === 'video' ? 'camera' : 'microphone' });
      if (permissionStatus.state === 'denied') {
        throw new Error(`Permission denied for ${type === 'video' ? 'camera' : 'microphone'}`);
      }
      
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10
      });
      
      localStream.current.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream.current);
      });
      
      peerConnection.current.ontrack = (event) => {
        console.log('Received remote track');
        remoteStream.current = event.streams[0];
        setCallStatus('connected');
      };
      
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate });
        }
      };
      
      peerConnection.current.oniceconnectionstatechange = () => {
        const state = peerConnection.current?.iceConnectionState;
        console.log('ICE connection state:', state);
        
        if (state === 'connected' || state === 'completed') {
          setCallStatus('connected');
        } else if (state === 'failed' || state === 'closed') {
          console.error('ICE connection failed or closed');
          endCall();
        }
      };
      
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      socket.emit('call-user', { offer, callType: type });
      
      // Set timeout for unanswered call (30 seconds)
      callTimeoutRef.current = setTimeout(() => {
        if (callStatus === 'calling') {
          alert('Call timed out - no answer');
          endCall();
        }
      }, 30000);
      
    } catch (error) {
      console.error('Error initializing call:', error);
      let errorMessage = 'Could not start call. ';
      
      if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
        errorMessage += 'Please allow camera/microphone permissions.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += `${type === 'video' ? 'Camera' : 'Microphone'} not found.`;
      } else if (error.name === 'NotReadableError') {
        errorMessage += `${type === 'video' ? 'Camera' : 'Microphone'} is already in use.`;
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
      endCall();
    }
  };
  
  const answerCall = async () => {
    // Stop ringtone when answering
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    
    try {
      setCallType(incomingCall.callType);
      setCallStatus('ringing');
      setShowCallInterface(true);
      
      const constraints = {
        audio: true,
        video: incomingCall.callType === 'video'
      };
      
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10
      });
      
      localStream.current.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream.current);
      });
      
      peerConnection.current.ontrack = (event) => {
        console.log('Received remote track');
        remoteStream.current = event.streams[0];
        setCallStatus('connected');
      };
      
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate });
        }
      };
      
      peerConnection.current.oniceconnectionstatechange = () => {
        const state = peerConnection.current?.iceConnectionState;
        console.log('ICE connection state:', state);
        
        if (state === 'connected' || state === 'completed') {
          setCallStatus('connected');
        } else if (state === 'failed' || state === 'closed') {
          console.error('ICE connection failed or closed');
          endCall();
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
      setIncomingCall(null);
    }
  };
  
  const declineCall = () => {
    // Stop ringtone when declining
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    setIncomingCall(null);
    socket.emit('reject-call');
  };
  
  const handleLeaveClick = () => {
    setShowLeaveConfirm(true);
  };
  
  const confirmLeave = () => {
    setShowLeaveConfirm(false);
    endCall(); // End any active call
    if (onLeaveSession) {
      onLeaveSession();
    }
  };
  
  const cancelLeave = () => {
    setShowLeaveConfirm(false);
  };
  
  return (
    <div className="chat-room">
      {error && (
        <div className="chat-error-banner">
          <div className="chat-error-content">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{error}</span>
            <button onClick={onDismissError} className="error-close">×</button>
          </div>
        </div>
      )}
      
      <div className="chat-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar-large">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              {selectedContact?.isOnline && <span className="online-indicator-large"></span>}
            </div>
            <div className="user-details">
              <span className="user-name">{selectedContact?.name || 'Chat Partner'}</span>
              <div className="user-status-row">
                <span className="user-status-text">
                  {connected 
                    ? (userCount === 2 ? 'Online' : 'Waiting for user...')
                    : 'Connecting...'
                  }
                </span>
                {sessionCode && (
                  <span className="session-code-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    {sessionCode}
                  </span>
                )}
              </div>
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
          
          <button 
            className="icon-btn leave-btn" 
            onClick={handleLeaveClick}
            title="Leave session"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
          peerConnection={peerConnection.current}
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
      
      {showLeaveConfirm && (
        <div className="leave-confirm-modal">
          <div className="modal-content">
            <h3>Leave Session?</h3>
            <p>Are you sure you want to leave this chat session?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={cancelLeave}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={confirmLeave}>
                Leave
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
        disabled={userCount < 2 || showCallInterface}
      />
    </div>
  );
}

export default ChatRoom;