import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  FileText, 
  Check, 
  AlertCircle, 
  Upload, 
  Paperclip,
  Radio,
  Volume2,
  RefreshCw,
  Info,
  CheckCircle2,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { SupportingDocument } from '../types/timetable';
import { getAuthHeaders } from '../utils/storage';

interface VoiceNoteRecorderProps {
  courseCode?: string;
  topicTitle?: string;
  onApplyTranscription: (text: string, mode: 'append' | 'replace' | 'summary') => void;
  onAttachAudio?: (doc: SupportingDocument) => void;
  onClose?: () => void;
}

// Pure client-side 16-bit PCM WAV encoder
// Encodes raw Float32 audio samples into standard universally playable .wav format
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF container descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');

  // Format header
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk size (16 for PCM)
  view.setUint16(20, 1, true);  // Audio format 1 = PCM (linear uncompressed)
  view.setUint16(22, 1, true);  // Channels: 1 = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate (sampleRate * channels * 16/8)
  view.setUint16(32, 2, true);  // Block align (channels * 16/8)
  view.setUint16(34, 16, true); // Bits per sample: 16

  // Data header
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write Float32 samples converted to 16-bit signed integers (clamped)
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// Downsample PCM buffer to 16kHz for speech-to-text optimization & light bandwidth
function downsampleBuffer(samples: Float32Array, inputRate: number, targetRate = 16000): Float32Array {
  if (inputRate === targetRate || inputRate <= 0) return samples;
  const ratio = inputRate / targetRate;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const origIndex = Math.min(Math.floor(i * ratio), samples.length - 1);
    result[i] = samples[origIndex];
  }
  return result;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  courseCode,
  topicTitle,
  onApplyTranscription,
  onAttachAudio,
  onClose
}) => {
  // Recording lifecycle: 'idle' | 'recording' | 'paused' | 'reviewing'
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'reviewing'>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0); // in seconds
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/wav');
  
  // Real-time audio waveform volume levels (8 bars: 0-100)
  const [waveformLevels, setWaveformLevels] = useState<number[]>([15, 20, 25, 20, 25, 20, 15, 10]);
  const [hasDetectedVoice, setHasDetectedVoice] = useState(false);
  const [peakAudioLevel, setPeakAudioLevel] = useState(0);
  
  // Permission & diagnostic state
  const [micPermissionState, setMicPermissionState] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');
  const [diagnosticNotice, setDiagnosticNotice] = useState<string | null>(null);

  // Network & Offline Status
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Transcription states
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState('');
  const [liveSpeechText, setLiveSpeechText] = useState('');
  const [transcriptionSource, setTranscriptionSource] = useState<'offline' | 'gemini' | null>(null);
  const [transcriptionNotice, setTranscriptionNotice] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isAudioAttached, setIsAudioAttached] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  // Audio Playback state
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Web Audio PCM recorder & MediaStream references
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const totalSamplesRef = useRef<number>(0);
  const recordingStateRef = useRef<'idle' | 'recording' | 'paused' | 'reviewing'>('idle');

  // Speech Recognition reference (Web Speech API for offline, 0-latency live transcription)
  const speechRecognitionRef = useRef<any>(null);

  // Timer & visualizer animation frame
  const timerIntervalRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Monitor network online / offline transitions
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check microphone permissions
  useEffect(() => {
    async function checkPermissions() {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicPermissionState(status.state as any);
          status.onchange = () => {
            setMicPermissionState(status.state as any);
          };
        }
      } catch {
        setMicPermissionState('unknown');
      }
    }
    checkPermissions();
  }, []);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Audio Recording (Offline-First PCM Capture + Real-Time Speech Recognition)
  const startRecording = async () => {
    setTranscriptionError(null);
    setTranscriptionNotice(null);
    setDiagnosticNotice(null);
    setApplySuccessMessage(null);
    setIsAudioAttached(false);
    setHasDetectedVoice(false);
    setPeakAudioLevel(0);
    setEditableTranscript('');
    setLiveSpeechText('');
    setTranscriptionSource(null);
    setRecordingDuration(0);
    pcmChunksRef.current = [];
    totalSamplesRef.current = 0;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone audio recording is not supported in this browser.');
      }

      // Request clean audio stream with standard hardware voice enhancements
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 44100,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      mediaStreamRef.current = stream;
      setMicPermissionState('granted');

      // Initialize Web Audio API for uncompressed PCM capture + real-time waveform
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);

      // Analyser Node for live visualizer
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      // ScriptProcessorNode for pure uncompressed PCM sample accumulation
      // (Bypasses all browser container/Opus chunk bugs, guaranteeing crystal-clear sound)
      const bufferSize = 4096;
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (recordingStateRef.current !== 'recording') return;
        const inputData = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(inputData);
        pcmChunksRef.current.push(copy);
        totalSamplesRef.current += copy.length;
      };

      // Route processor through a muted GainNode to avoid feedback into user's speakers
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      // Animate waveform bars and detect voice presence
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        const bars: number[] = [];
        for (let i = 0; i < 8; i++) {
          const val = dataArray[i * 2] || 0;
          sum += val;
          bars.push(Math.max(15, Math.min(100, Math.round((val / 255) * 100))));
        }
        const avg = Math.round(sum / 8);
        if (avg > 15) {
          setHasDetectedVoice(true);
        }
        setPeakAudioLevel(prev => Math.max(prev, avg));
        setWaveformLevels(bars);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      animationFrameRef.current = requestAnimationFrame(updateWaveform);

      // Initialize Web Speech API for INSTANT, offline, zero-latency local speech-to-text
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let finalStr = '';
            let interimStr = '';
            for (let i = 0; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalStr += event.results[i][0].transcript + ' ';
              } else {
                interimStr += event.results[i][0].transcript;
              }
            }
            const combined = (finalStr + interimStr).trim();
            if (combined) {
              setLiveSpeechText(combined);
              setEditableTranscript(combined);
              setTranscriptionSource('offline');
            }
          };

          recognition.onerror = (e: any) => {
            console.warn('[Web Speech API Notice]', e?.error);
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (speechErr) {
          console.warn('[Web Speech API Init Notice]', speechErr);
        }
      }

      setRecordingState('recording');
      recordingStateRef.current = 'recording';

      // Duration counter
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('[Recorder Error]', err);
      let errorMsg = 'Unable to access microphone.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setMicPermissionState('denied');
        errorMsg = 'Microphone permission was denied. Please allow microphone access in your browser address bar.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errorMsg = 'No microphone device was detected. Please connect a microphone or headset.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        errorMsg = 'Microphone is currently in use by another tab or application.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setDiagnosticNotice(errorMsg);
      setRecordingState('idle');
      recordingStateRef.current = 'idle';
    }
  };

  // Pause / Resume recording
  const pauseRecording = () => {
    setRecordingState('paused');
    recordingStateRef.current = 'paused';
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const resumeRecording = () => {
    setRecordingState('recording');
    recordingStateRef.current = 'recording';
    timerIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  // Stop recording and finalize WAV audio + Instant Speech Transcript
  const stopRecording = () => {
    setRecordingState('reviewing');
    recordingStateRef.current = 'reviewing';

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    // Stop live SpeechRecognition
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    // Stop hardware microphone tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect Web Audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Encode collected Float32 PCM samples into a pristine WAV file
    const ctx = audioContextRef.current;
    const inputSampleRate = ctx?.sampleRate || 44100;
    const totalSamples = totalSamplesRef.current;

    if (totalSamples === 0) {
      setDiagnosticNotice('No audio data was captured. Please check that your microphone is unmuted and speak clearly.');
      return;
    }

    // Merge Float32 chunks
    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of pcmChunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Downsample to 16kHz for human speech clarity and optimal file size
    const downsampled = downsampleBuffer(merged, inputSampleRate, 16000);
    const wavBlob = encodeWAV(downsampled, 16000);

    // Close AudioContext
    if (ctx && ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }

    // Wrap WAV Blob into standard File object (identical to upload pipeline)
    const fileName = `voice_recording_${Date.now()}.wav`;
    const recordedFile = new File([wavBlob], fileName, { type: 'audio/wav' });

    setAudioBlob(recordedFile);
    setAudioMimeType('audio/wav');
    const url = URL.createObjectURL(recordedFile);
    setAudioUrl(url);

    console.log(`[Audio Recorder] Capture finalized: ${recordedFile.size} bytes (audio/wav, 16kHz mono)`);

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      setAudioBase64(base64data);

      // OFFLINE-FIRST STRATEGY:
      // 1. If Web Speech API captured text locally: It is ALREADY displayed with zero delay!
      // 2. If no local text was detected and we are online: Automatically trigger Gemini online transcription.
      // 3. If no local text and offline: Notify user that audio is saved and ready for export or playback.
      if (liveSpeechText.trim()) {
        const words = liveSpeechText.trim().split(/\s+/).length;
        setTranscriptionNotice(`⚡ Offline Speech-to-Text: Transcribed locally on-device (${words} words). You can edit the text or click "Enhance with Gemini AI" for cloud refinement.`);
      } else if (navigator.onLine) {
        requestTranscription(base64data, 'audio/wav', liveSpeechText);
      } else {
        setTranscriptionNotice('Audio recording saved locally. You are currently offline; you can listen to playback or type notes manually.');
      }
    };
    reader.readAsDataURL(recordedFile);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Request Gemini Speech-to-Text Transcription from Server (Online / Refinement flow)
  const requestTranscription = async (base64AudioData: string, mime: string, existingOfflineText?: string) => {
    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const commaIdx = base64AudioData.indexOf(',');
      const rawBase64 = (commaIdx !== -1 ? base64AudioData.slice(commaIdx + 1) : base64AudioData).trim();
      const cleanMime = (mime || 'audio/wav').split(';')[0].trim();

      if (!rawBase64 || rawBase64.length < 50) {
        throw new Error('Recorded audio is empty. Please speak clearly into your microphone.');
      }

      const authHeaders = getAuthHeaders();
      const res = await fetch('/api/notes/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          audioBase64: rawBase64,
          mimeType: cleanMime,
          courseCode: courseCode || '',
          topicTitle: topicTitle || '',
          offlineText: existingOfflineText || editableTranscript || ''
        })
      });

      // Guard against unexpected non-JSON response
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const rawText = await res.text();
        console.warn('[Transcription Service Non-JSON Response]', res.status, rawText.slice(0, 200));
        throw new Error(`The transcription server responded with status ${res.status}. Your local transcript has been preserved.`);
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Transcription service returned status ${res.status}`);
      }

      const resultText = (data.transcription || '').trim();
      if (resultText) {
        setEditableTranscript(resultText);
        setTranscriptionSource('gemini');
        const wordCount = resultText.split(/\s+/).filter(Boolean).length;
        setTranscriptionNotice(`✨ Gemini AI Cloud Transcription complete (${wordCount} words · ${data.detectedMime || cleanMime}). Academic terms & formatting refined.`);
      } else if (!editableTranscript.trim()) {
        setTranscriptionNotice('No spoken words were recognized in the audio clip. You can play back your recording to check if your voice was audible.');
      }

    } catch (err: any) {
      console.warn('[Transcription Service Notice]:', err?.message);
      // Graceful offline fallback: if local transcript is present, retain it!
      if (editableTranscript.trim()) {
        setTranscriptionNotice('Cloud transcription unavailable. Your local offline transcript is active and ready to edit.');
      } else {
        setTranscriptionError(err?.message || 'Could not reach cloud transcription service. You can play back your audio recording or type notes manually.');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle uploading an external audio file (.mp3, .wav, .m4a, etc.)
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert(`Audio file "${file.name}" exceeds the 25MB limit.`);
      return;
    }

    setRecordingState('reviewing');
    recordingStateRef.current = 'reviewing';
    setAudioBlob(file);

    const ext = file.name.split('.').pop()?.toLowerCase();
    let resolvedType = file.type;
    if (!resolvedType || resolvedType === 'application/octet-stream') {
      if (ext === 'mp3') resolvedType = 'audio/mp3';
      else if (ext === 'wav') resolvedType = 'audio/wav';
      else if (ext === 'm4a') resolvedType = 'audio/mp4';
      else if (ext === 'ogg') resolvedType = 'audio/ogg';
      else if (ext === 'flac') resolvedType = 'audio/flac';
      else if (ext === 'webm') resolvedType = 'audio/webm';
      else resolvedType = 'audio/mp3';
    } else if (resolvedType === 'audio/mpeg' || resolvedType === 'audio/mpg') {
      resolvedType = 'audio/mp3';
    } else if (resolvedType === 'audio/x-m4a') {
      resolvedType = 'audio/mp4';
    }

    setAudioMimeType(resolvedType);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      setAudioBase64(base64data);
      requestTranscription(base64data, resolvedType);
    };
    reader.readAsDataURL(file);
  };

  // Reset and record again
  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setAudioBase64(null);
    setRecordingDuration(0);
    setEditableTranscript('');
    setLiveSpeechText('');
    setTranscriptionSource(null);
    setTranscriptionError(null);
    setTranscriptionNotice(null);
    setDiagnosticNotice(null);
    setApplySuccessMessage(null);
    setIsAudioAttached(false);
    setHasDetectedVoice(false);
    setPeakAudioLevel(0);
    pcmChunksRef.current = [];
    totalSamplesRef.current = 0;
    setRecordingState('idle');
    recordingStateRef.current = 'idle';
  };

  // Attach recorded audio to note's supporting documents
  const handleAttachAudioToNote = () => {
    if (!audioBlob || !audioBase64 || !onAttachAudio) return;

    const ext = audioMimeType.includes('wav') ? 'wav' : audioMimeType.includes('mp4') ? 'm4a' : audioMimeType.includes('ogg') ? 'ogg' : 'mp3';
    const docName = `Voice_Note_${(courseCode || 'Session').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.${ext}`;
    
    const sizeInBytes = audioBlob.size;
    const sizeFormatted = sizeInBytes > 1024 * 1024 
      ? `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(sizeInBytes / 1024)} KB`;

    const doc: SupportingDocument = {
      id: `audio-${Date.now()}`,
      name: docName,
      type: 'audio',
      mimeType: audioMimeType,
      size: sizeInBytes,
      sizeFormatted,
      url: audioBase64,
      uploadedAt: new Date().toISOString()
    };

    onAttachAudio(doc);
    setIsAudioAttached(true);
    setApplySuccessMessage('Voice recording attached to session learning materials.');
  };

  // Apply transcribed text to note
  const handleApply = (mode: 'append' | 'replace' | 'summary') => {
    const textToInsert = editableTranscript.trim();
    if (!textToInsert) return;

    onApplyTranscription(textToInsert, mode);
    setApplySuccessMessage(
      mode === 'append' 
        ? 'Transcribed text appended to Session Learning Notes.' 
        : mode === 'replace' 
        ? 'Session Learning Notes updated with transcription.' 
        : 'Transcribed text saved as Executive Summary.'
    );
  };

  // Test Play Audio
  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (audioPlayerRef.current.paused) {
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.volume = 1.0;
      audioPlayerRef.current.muted = false;
      audioPlayerRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => {});
    } else {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="bg-slate-950/95 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in">
      
      {/* Title & Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-700/60 text-cyan-400 flex items-center justify-center shrink-0">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Voice Note Recorder & Speech-to-Text</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Offline-First</span>
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/90 text-cyan-300 border border-cyan-800 items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Gemini AI Fallback</span>
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Instant on-device transcription with zero delay + uncompressed WAV audio capture and cloud AI refinement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Network Connection Indicator */}
          <span 
            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border ${
              isOnline 
                ? 'bg-slate-900 border-slate-700 text-slate-300' 
                : 'bg-amber-950/80 border-amber-800 text-amber-300'
            }`}
            title={isOnline ? 'Online: Cloud AI refinement enabled' : 'Offline: Local on-device transcription active'}
          >
            {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline Mode'}</span>
          </span>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Permission / Diagnostic Alert */}
      {diagnosticNotice && (
        <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block text-white">Microphone Setup Notice</span>
            <p className="leading-relaxed text-amber-200/90">{diagnosticNotice}</p>
            {micPermissionState === 'denied' && (
              <p className="text-[11px] text-amber-300 font-mono">
                Tip: Click the lock / permissions icon in your browser address bar and set Microphone to "Allow".
              </p>
            )}
          </div>
        </div>
      )}

      {/* RECORDING STATE: Idle */}
      {recordingState === 'idle' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Ready to record lecture notes</span>
              <span className="text-[11px] text-slate-400 block">
                Tap Record to speak. Audio is captured in uncompressed PCM WAV (guaranteed sound) with instant local speech-to-text.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={startRecording}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Start Recording</span>
            </button>

            <label className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0" title="Upload audio file (.mp3, .m4a, .wav, .webm)">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Upload Audio</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* RECORDING STATE: Recording or Paused */}
      {(recordingState === 'recording' || recordingState === 'paused') && (
        <div className="p-4 rounded-xl bg-slate-900 border border-rose-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className={`w-3.5 h-3.5 rounded-full block ${recordingState === 'recording' ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />
                <span className={`w-3.5 h-3.5 rounded-full block absolute inset-0 ${recordingState === 'recording' ? 'bg-rose-500' : 'bg-amber-500'}`} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block font-mono">
                  {recordingState === 'recording' ? 'RECORDING VOICE NOTE...' : 'RECORDING PAUSED'}
                </span>
                <span className="text-lg font-mono font-bold text-cyan-400 tabular-nums">
                  {formatTime(recordingDuration)}
                </span>
              </div>
            </div>

            {/* Live animated waveform visualizer with Voice Signal Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-end gap-1.5 h-9 px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
                {waveformLevels.map((lvl, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${lvl}%` }}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      recordingState === 'recording' 
                        ? hasDetectedVoice ? 'bg-cyan-400' : 'bg-cyan-600/50' 
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Live sound presence badge */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono">
                {hasDetectedVoice ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Voice Input Active</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                    <Volume2 className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                    <span>Listening...</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {recordingState === 'recording' ? (
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 border border-cyan-800 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-950/60 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Finish & Transcribe</span>
              </button>
            </div>
          </div>

          {/* Real-time live speech preview as the user speaks (Offline Web Speech) */}
          {liveSpeechText && (
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1 animate-in fade-in">
              <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Live On-Device Speech Recognition:</span>
              </span>
              <p className="text-slate-200 italic leading-relaxed text-[11px] line-clamp-2">
                "{liveSpeechText}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* RECORDING STATE: Reviewing & Transcribed */}
      {recordingState === 'reviewing' && (
        <div className="space-y-4">
          
          {/* Audio Playback & Re-record bar */}
          <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 truncate">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-400 flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="truncate">
                <span className="font-semibold text-white block truncate">
                  Recorded Audio Note ({formatTime(recordingDuration || 1)})
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {audioBlob ? `${(audioBlob.size / 1024).toFixed(1)} KB` : ''} · {audioMimeType} · Guaranteed Audible Playback
                </span>
              </div>
            </div>

            {audioUrl && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 shadow"
                  title="Test audio playback sound"
                >
                  {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlayingAudio ? 'Pause' : 'Play Sound'}</span>
                </button>

                <audio
                  ref={audioPlayerRef}
                  controls
                  playsInline
                  preload="auto"
                  src={audioUrl}
                  className="h-9 w-full sm:w-64 rounded-lg accent-cyan-500"
                  onCanPlay={() => {
                    if (audioPlayerRef.current) {
                      audioPlayerRef.current.volume = 1.0;
                      audioPlayerRef.current.muted = false;
                    }
                  }}
                  onPlay={() => {
                    setIsPlayingAudio(true);
                    if (audioPlayerRef.current) {
                      audioPlayerRef.current.volume = 1.0;
                      audioPlayerRef.current.muted = false;
                    }
                  }}
                  onPause={() => setIsPlayingAudio(false)}
                  onEnded={() => setIsPlayingAudio(false)}
                />
              </div>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              {audioBase64 && (
                <button
                  type="button"
                  onClick={() => requestTranscription(audioBase64, audioMimeType, editableTranscript)}
                  disabled={isTranscribing}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-mono flex items-center gap-1 border border-cyan-800 transition-colors cursor-pointer disabled:opacity-50"
                  title="Enhance transcript using Gemini AI"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isTranscribing ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
                  <span>{transcriptionSource === 'offline' ? 'Enhance with Gemini' : 'Re-transcribe'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Discard and record a new voice note"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Record Again</span>
              </button>
            </div>
          </div>

          {/* AI Transcription Progress indicator */}
          {isTranscribing && (
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 flex items-center gap-3 text-xs text-cyan-300">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" />
              <div>
                <span className="font-bold block">Refining notes with Gemini AI...</span>
                <span className="text-slate-300 text-[11px]">
                  Structuring speech into structured academic concepts, formatting definitions, and correcting technical terminology.
                </span>
              </div>
            </div>
          )}

          {/* Transcription Notice / Mode Badge */}
          {transcriptionNotice && (
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/50 flex items-center gap-2.5 text-xs text-cyan-200">
              {transcriptionSource === 'offline' ? (
                <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span>{transcriptionNotice}</span>
            </div>
          )}

          {/* Transcription Error Notification */}
          {transcriptionError && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center gap-2.5 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{transcriptionError}</span>
            </div>
          )}

          {/* Success Banner */}
          {applySuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{applySuccessMessage}</span>
            </div>
          )}

          {/* Editable Transcription Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Transcribed Notes (Review, edit, or format before inserting)</span>
                {transcriptionSource === 'offline' && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                    ⚡ Offline Local
                  </span>
                )}
                {transcriptionSource === 'gemini' && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                    ✨ Gemini Cloud
                  </span>
                )}
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {editableTranscript.length} characters · {editableTranscript.trim() ? editableTranscript.trim().split(/\s+/).length : 0} words
              </span>
            </div>

            <textarea
              rows={5}
              value={editableTranscript}
              onChange={(e) => setEditableTranscript(e.target.value)}
              placeholder="Your voice transcription will appear here once audio processing completes. You can review and edit every word before inserting into your session notes..."
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
            />
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-2">
              {onAttachAudio && (
                <button
                  type="button"
                  onClick={handleAttachAudioToNote}
                  disabled={isAudioAttached}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isAudioAttached
                      ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 cursor-default'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
                  }`}
                  title="Attach this audio recording directly to the session notes so you can re-listen later"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{isAudioAttached ? 'Audio Attached ✓' : 'Attach Voice Audio'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApply('summary')}
                disabled={!editableTranscript.trim()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium cursor-pointer"
                title="Fill the Executive Summary with this transcribed text"
              >
                Set as Summary
              </button>

              <button
                type="button"
                onClick={() => handleApply('replace')}
                disabled={!editableTranscript.trim()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium cursor-pointer"
                title="Replace Detailed Learning Notes content with this transcription"
              >
                Replace Notes
              </button>

              <button
                type="button"
                onClick={() => handleApply('append')}
                disabled={!editableTranscript.trim()}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-950/50 cursor-pointer"
                title="Append transcribed text to the end of Detailed Learning Notes"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Append to Notes</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
