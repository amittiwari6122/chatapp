import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../../lib/socket';

export default function VideoCallModal({ call, onEnd }) {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef();
  const localStreamRef = useRef();
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [status, setStatus] = useState(call.incoming ? 'incoming' : 'calling');
  const socket = getSocket();

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const getLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: call.isVideo,
      audio: true,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const createPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('webrtc:ice-candidate', {
          targetUserId: call.targetUserId,
          candidate: e.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('connected');
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) endCall();
    };

    return pc;
  };

  useEffect(() => {
    if (call.incoming) return; // Caller initiates the offer

    const initCall = async () => {
      const stream = await getLocalStream();
      const pc = createPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit('webrtc:offer', { targetUserId: call.targetUserId, offer });
    };

    initCall();

    // Listen for WebRTC signals
    socket?.on('webrtc:answer', async ({ answer }) => {
      await peerConnectionRef.current?.setRemoteDescription(answer);
      setStatus('connected');
    });

    socket?.on('webrtc:ice-candidate', async ({ candidate }) => {
      try { await peerConnectionRef.current?.addIceCandidate(candidate); } catch {}
    });

    socket?.on('call:ended', endCall);
    socket?.on('call:rejected', () => { setStatus('rejected'); setTimeout(endCall, 1500); });

    return () => {
      socket?.off('webrtc:answer');
      socket?.off('webrtc:ice-candidate');
      socket?.off('call:ended');
      socket?.off('call:rejected');
    };
  }, []);

  const acceptCall = async () => {
    setStatus('connecting');
    const stream = await getLocalStream();
    const pc = createPeerConnection(stream);

    socket?.on('webrtc:offer', async ({ offer }) => {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit('webrtc:answer', { targetUserId: call.from._id, answer });
    });

    socket?.on('webrtc:ice-candidate', async ({ candidate }) => {
      try { await pc.addIceCandidate(candidate); } catch {}
    });

    socket?.emit('call:accept', { targetUserId: call.from._id, roomId: call.roomId });
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnectionRef.current?.close();
    if (call.targetUserId) {
      socket?.emit('call:end', { targetUserId: call.targetUserId });
    }
    onEnd();
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled); }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVideoOff(!track.enabled); }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/95 backdrop-blur z-50 flex flex-col items-center justify-center fade-in">
      {/* Remote video full background */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Status */}
      {status !== 'connected' && (
        <div className="relative z-10 text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-brand-600 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4 shadow-2xl">
            {(call.from?.username || call.callerName || 'U')[0].toUpperCase()}
          </div>
          <p className="text-2xl font-semibold text-white">{call.from?.username || call.callerName || 'Unknown'}</p>
          <p className="text-gray-300 mt-1">
            {status === 'incoming' ? '📞 Incoming call...' :
             status === 'calling' ? '🔔 Calling...' :
             status === 'connecting' ? '⏳ Connecting...' :
             status === 'rejected' ? '❌ Call rejected' : ''}
          </p>
        </div>
      )}

      {/* Local video (PIP) */}
      <div className="absolute top-4 right-4 w-32 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl z-10">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      </div>

      {/* Controls */}
      <div className="absolute bottom-10 z-10 flex items-center gap-4">
        {status === 'incoming' ? (
          <>
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
              <svg className="w-7 h-7 text-white rotate-135" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-red-500/80' : 'bg-white/20 hover:bg-white/30'}`}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={muted
                  ? "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  : "M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-4-4m4 4l4-4"} />
              </svg>
            </button>
            {call.isVideo && (
              <button
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${videoOff ? 'bg-red-500/80' : 'bg-white/20 hover:bg-white/30'}`}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
