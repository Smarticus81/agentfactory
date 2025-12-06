import { useState, useCallback, useEffect, useRef } from 'react';

// This is a placeholder. In a real app, you'd use a more robust wake word engine.
const mockWakeWordDetector = {
  init: async () => {},
  start: (onDetected: () => void) => {
    console.log("Mock wake word detector started. Say 'Hey James' to trigger.");
    // Simulate wake word after a delay for testing
    const timeoutId = setTimeout(onDetected, 5000);
    return () => clearTimeout(timeoutId);
  },
  stop: () => {
    console.log("Mock wake word detector stopped.");
  },
};

export const useWakeWord = (
  wakeWords: string[],
  onWakeWord: () => void,
) => {
  const [isListening, setIsListening] = useState(false);
  const stopListeningRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    if (isListening) return;
    setIsListening(true);
    stopListeningRef.current = mockWakeWordDetector.start(onWakeWord);
  }, [isListening, onWakeWord]);

  const stop = useCallback(() => {
    if (!isListening) return;
    if (stopListeningRef.current) {
      stopListeningRef.current();
      stopListeningRef.current = null;
    }
    setIsListening(false);
  }, [isListening]);

  useEffect(() => {
    mockWakeWordDetector.init();
    return () => {
      stop();
    };
  }, [stop]);

  return { start, stop, isListening };
};
