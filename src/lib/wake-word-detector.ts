// Advanced Wake Word Detection with Fuzzy Matching
// Supports browser-based detection with low latency

import { levenshteinDistance } from './levenshtein';

export interface WakeWordConfig {
  wakeWords: string[];
  threshold: number;
  timeout: number;
  onWakeWordDetected: (word: string, confidence: number) => void;
  onCommandReceived: (command: string, confidence: number) => void;
  onModeChange: (mode: 'wake_word' | 'command' | 'shutdown') => void;
}

export class WakeWordDetector {
  private recognition: any;
  private mode: 'wake_word' | 'command' | 'shutdown' = 'shutdown';
  private config: WakeWordConfig;
  private isListening = false;
  private commandTimeout: NodeJS.Timeout | null = null;
  private wakeWordVariants: Map<string, string[]> = new Map();
  private terminationPhrases = [
    'stop listening', 'end call', 'bye bev', 'thanks bev', 'bye bar', 'thanks bar',
    'goodbye', 'thank you', 'stop', 'exit', 'quit', 'that\'s all', 'end conversation',
    'stop talking', 'go back to sleep', 'return to wake word', 'back to listening'
  ];
  private shutdownPhrases = ['shut down', 'shutdown', 'power off', 'turn off'];

  constructor(config: WakeWordConfig) {
    console.log('WakeWordDetector constructor called with config:', config);
    this.config = config;
    this.initializeWakeWordVariants();
    this.initializeSpeechRecognition();
    console.log('WakeWordDetector initialization complete');
  }

  private initializeWakeWordVariants() {
    // Generate phonetic variants for better matching
    this.config.wakeWords.forEach(word => {
      const variants = this.generatePhoneticVariants(word);
      this.wakeWordVariants.set(word, variants);
    });
  }

  private generatePhoneticVariants(word: string): string[] {
    const variants: string[] = [word.toLowerCase()];
    
    // Common phonetic substitutions
    const substitutions: { [key: string]: string[] } = {
      'bev': ['bev', 'beth', 'beb', 'bef', 'dev'],
      'hey': ['hey', 'hay', 'hi', 'hei', 'ay'],
      'bar': ['bar', 'barr', 'bahr', 'bhar'],
      'venue': ['venue', 'venu', 'venew', 'venyou']
    };

    word.toLowerCase().split(' ').forEach(part => {
      if (substitutions[part]) {
        substitutions[part].forEach(sub => {
          variants.push(word.toLowerCase().replace(part, sub));
        });
      }
    });

    return Array.from(new Set(variants));
  }

  private initializeSpeechRecognition() {
    console.log('Initializing speech recognition for wake word detection...');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('SpeechRecognition API not supported in this browser');
      throw new Error('SpeechRecognition API not supported');
    }
    
    console.log('Creating SpeechRecognition instance...');
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      console.log('Wake word detection started');
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      const results = event.results[event.results.length - 1];
      const transcript = results[0].transcript.toLowerCase().trim();
      const confidence = results[0].confidence || 0.8;

      this.processTranscript(transcript, confidence, results.isFinal);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Continue listening
        return;
      }
      this.handleError(event.error);
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isListening = false;
      
      // Only restart if in wake_word mode - don't restart during command processing
      if (this.mode === 'wake_word') {
        console.log('Restarting speech recognition for wake word detection');
        setTimeout(() => this.start(), 100);
      } else if (this.mode === 'command') {
        console.log('In command mode - letting OpenAI handle audio input');
      }
    };
  }

  private processTranscript(transcript: string, confidence: number, isFinal: boolean) {
    if (!isFinal && this.mode !== 'command') return;

    console.log(`Processing: "${transcript}" (mode: ${this.mode}, confidence: ${confidence})`);

    switch (this.mode) {
      case 'wake_word':
        this.detectWakeWord(transcript, confidence);
        break;
      case 'command':
        this.processCommand(transcript, confidence);
        break;
    }
  }

  private detectWakeWord(transcript: string, confidence: number) {
    let bestMatch = { word: '', score: Infinity };

    // Check each wake word and its variants
    this.wakeWordVariants.forEach((variants, original) => {
      variants.forEach(variant => {
        const distance = this.fuzzyMatch(transcript, variant);
        if (distance < bestMatch.score) {
          bestMatch = { word: original, score: distance };
        }
      });
    });

    // Check if match is within threshold
    const normalizedScore = 1 - (bestMatch.score / Math.max(transcript.length, bestMatch.word.length));
    
    if (normalizedScore >= this.config.threshold) {
      console.log(`Wake word detected: "${bestMatch.word}" (confidence: ${normalizedScore})`);
      this.switchMode('command');
      this.config.onWakeWordDetected(bestMatch.word, normalizedScore);
      
      // Set timeout to return to wake word mode
      this.resetCommandTimeout();
    }
  }

  private processCommand(transcript: string, confidence: number) {
    // Filter out very low confidence commands
    if (confidence < 0.5) {
      console.log(`Ignoring low confidence command: "${transcript}" (confidence: ${confidence})`);
      return;
    }
    
    // Reset timeout on each command
    this.resetCommandTimeout();

    // Check for termination phrases (stricter matching)
    const isTermination = this.terminationPhrases.some(phrase => {
      const exactMatch = transcript.toLowerCase().includes(phrase.toLowerCase());
      const fuzzyScore = this.fuzzyMatch(transcript, phrase);
      return exactMatch || fuzzyScore <= 1; // Much stricter
    });

    if (isTermination) {
      console.log('Termination phrase detected, returning to wake word mode');
      // Trigger a goodbye message before switching modes
      this.config.onCommandReceived('TERMINATION_DETECTED', confidence);
      setTimeout(() => this.switchMode('wake_word'), 1000); // Small delay for goodbye message
      return;
    }

    // Check for shutdown phrases
    const isShutdown = this.shutdownPhrases.some(phrase => 
      this.fuzzyMatch(transcript, phrase) <= 1
    );

    if (isShutdown) {
      console.log('Shutdown phrase detected');
      this.stop();
      return;
    }

    // Process as command
    this.config.onCommandReceived(transcript, confidence);
  }

  private fuzzyMatch(text: string, pattern: string): number {
    // Use sliding window for better phrase matching
    const words = text.split(' ');
    const patternWords = pattern.split(' ');
    let minDistance = Infinity;

    for (let i = 0; i <= words.length - patternWords.length; i++) {
      const phrase = words.slice(i, i + patternWords.length).join(' ');
      const distance = levenshteinDistance(phrase, pattern);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  private resetCommandTimeout() {
    if (this.commandTimeout) {
      clearTimeout(this.commandTimeout);
    }

    this.commandTimeout = setTimeout(() => {
      console.log('Command timeout, returning to wake word mode');
      this.switchMode('wake_word');
    }, this.config.timeout);
  }

  private switchMode(mode: 'wake_word' | 'command' | 'shutdown') {
    // Prevent rapid mode changes
    if (this.mode === mode) {
      return; // Already in this mode
    }
    
    console.log(`Mode switching from ${this.mode} to ${mode}`);
    this.mode = mode;
    this.config.onModeChange(mode);
    
    if (mode === 'shutdown') {
      this.stop();
    }
  }

  private handleError(error: string) {
    switch (error) {
      case 'not-allowed':
        console.error('Microphone access denied');
        break;
      case 'no-speech':
        // Continue listening
        break;
      case 'network':
        console.error('Network error in speech recognition');
        break;
      default:
        console.error('Speech recognition error:', error);
    }
  }

  public start() {
    console.log('WakeWordDetector start() called, current state:', { isListening: this.isListening, mode: this.mode });
    
    if (this.isListening) {
      console.log('Already listening, returning early');
      return;
    }
    
    this.mode = 'wake_word';
    this.config.onModeChange('wake_word');
    console.log('Mode changed to wake_word, attempting to start speech recognition...');
    
    try {
      console.log('Calling recognition.start()...');
      this.recognition.start();
      console.log('recognition.start() called successfully');
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      throw error;
    }
  }

  public stop() {
    this.mode = 'shutdown';
    this.config.onModeChange('shutdown');
    
    if (this.commandTimeout) {
      clearTimeout(this.commandTimeout);
      this.commandTimeout = null;
    }
    
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  public getCurrentMode(): 'wake_word' | 'command' | 'shutdown' {
    return this.mode;
  }

  public setWakeWords(words: string[]) {
    this.config.wakeWords = words;
    this.initializeWakeWordVariants();
  }
}
