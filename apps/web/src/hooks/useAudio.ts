import { useState, useCallback, useRef, useEffect } from 'react';

export interface AudioContextState {
  isRecording: boolean;
  isPlaying: boolean;
  audioBlob: Blob | null;
  error: string | null;
}

export function useAudio() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [state, setState] = useState<AudioContextState>({
    isRecording: false,
    isPlaying: false,
    audioBlob: null,
    error: null,
  });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setState((prev) => ({ ...prev, audioBlob }));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setState((prev) => ({ ...prev, isRecording: true, error: null }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start recording';
      setState((prev) => ({ ...prev, error: msg }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setState((prev) => ({ ...prev, isRecording: false }));
    }
  }, []);

  const playAudio = useCallback(async (blob: Blob) => {
    try {
      const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      setState((prev) => ({ ...prev, isPlaying: true, error: null }));

      source.onended = () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
      };

      source.start(0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to play audio';
      setState((prev) => ({ ...prev, error: msg }));
    }
  }, []);

  const clearAudio = useCallback(() => {
    setState((prev) => ({ ...prev, audioBlob: null }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    playAudio,
    clearAudio,
  };
}

export function useVoiceRecording() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, []);

  const stop = useCallback(
    async (): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        if (!mediaRecorderRef.current) {
          reject(new Error('No recorder instance'));
          return;
        }

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          streamRef.current?.getTracks().forEach((track) => track.stop());
          setIsRecording(false);
          resolve(blob);
        };

        mediaRecorderRef.current.stop();
      });
    },
    []
  );

  return { isRecording, isProcessing, setIsProcessing, start, stop };
}
