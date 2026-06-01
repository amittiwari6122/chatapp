import { useState, useRef, useCallback } from 'react';
import { getSocket } from '../../lib/socket';
import { useChatStore } from '../../store/chatStore';
import api from '../../lib/api';

export default function MessageInput({ onSend, replyTo, onCancelReply }) {
  const { activeRoom } = useChatStore();
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef();
  const mediaRecorderRef = useRef();
  const audioChunksRef = useRef([]);
  const timerRef = useRef();
  const typingTimerRef = useRef();
  const isTypingRef = useRef(false);

  const emitTyping = useCallback((typing) => {
    const socket = getSocket();
    if (!activeRoom) return;
    if (typing && !isTypingRef.current) {
      socket?.emit('typing:start', { roomId: activeRoom._id });
      isTypingRef.current = true;
    }
    if (!typing && isTypingRef.current) {
      socket?.emit('typing:stop', { roomId: activeRoom._id });
      isTypingRef.current = false;
    }
  }, [activeRoom]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    emitTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emitTyping(false), 1500);
  };

  const handleSend = () => {
    if (!text.trim() && !uploading) return;
    emitTyping(false);
    onSend({ content: text.trim(), type: 'text', replyTo: replyTo?._id });
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSend({
        content: '',
        type: data.type,
        fileUrl: data.url,
        fileName: data.filename,
        fileSize: data.size,
        replyTo: replyTo?._id,
      });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        const file = new File([blob], `voice-${Date.now()}.ogg`, { type: 'audio/ogg' });
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        setRecordingTime(0);
        clearInterval(timerRef.current);
        await handleFileUpload(file);
      };

      mediaRecorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current?.stop();
    }
    audioChunksRef.current = [];
    setRecording(false);
    setRecordingTime(0);
    clearInterval(timerRef.current);
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="border-t border-white/5 p-4 bg-gray-900/50">
      {/* Reply banner */}
      {replyTo && (
        <div className="flex items-center justify-between bg-white/5 border-l-2 border-brand-500 rounded-xl px-3 py-2 mb-3">
          <div>
            <p className="text-xs font-medium text-brand-300">{replyTo.sender?.username}</p>
            <p className="text-xs text-gray-400 truncate max-w-xs">{replyTo.content || '📎 Attachment'}</p>
          </div>
          <button onClick={onCancelReply} className="text-gray-500 hover:text-gray-300 ml-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {recording ? (
        /* Recording UI */
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 font-mono text-sm flex-1">{formatTime(recordingTime)}</span>
          <button onClick={cancelRecording} className="text-gray-400 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button onClick={stopRecording} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
            Send
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {/* File attach */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost p-2.5 flex-shrink-0"
            disabled={uploading}
          >
            {uploading ? (
              <svg className="w-5 h-5 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
            onChange={e => handleFileUpload(e.target.files[0])}
          />

          {/* Text input */}
          <textarea
            className="input-field flex-1 resize-none py-2.5 min-h-10 max-h-32 text-sm"
            placeholder="Type a message..."
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ height: 'auto' }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />

          {/* Send or Voice */}
          {text.trim() ? (
            <button onClick={handleSend} className="btn-primary px-3 py-2.5 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          ) : (
            <button
              onMouseDown={startRecording}
              className="btn-ghost p-2.5 flex-shrink-0 text-gray-400 hover:text-red-400 transition-colors"
              title="Hold to record voice message"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
