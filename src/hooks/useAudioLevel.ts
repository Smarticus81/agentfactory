import { useState, useEffect, useRef } from 'react';

export const useAudioLevel = () => {
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
  };

  useEffect(() => {
    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyserRef.current = analyser;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        const getAudioLevel = () => {
          if (analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / bufferLength;
            setAudioLevel(average / 128); // Normalize to 0-2 range
          }
          animationFrameRef.current = requestAnimationFrame(getAudioLevel);
        };

        getAudioLevel();

      } catch (err) {
        console.error('Error accessing microphone for audio level:', err);
      }
    };

    setupAudio();

    return () => {
      cleanup();
    };
  }, []);

  return audioLevel;
};
