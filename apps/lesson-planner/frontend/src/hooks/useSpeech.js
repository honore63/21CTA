/**
 * useSpeech - Hook for speech recognition and synthesis
 * Provides voice input and output capabilities for the AI Agent
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastError, setLastError] = useState(null);

  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const audioRef = useRef(null);

  const isListeningRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Initialize speech APIs
  useEffect(() => {
    // Speech Recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US'; // Default, can be changed based on context

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript);
        // Optionally set interim transcript for real-time feedback
        // setInterimTranscript(interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setLastError(`Speech recognition error: ${event.error}`);
      };

      recognitionRef.current.onend = () => {
        // Auto-restart if we were listening and it ended unexpectedly
        if (isListeningRef.current) {
          setTimeout(() => {
            if (isListeningRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.warn('Failed to restart speech recognition:', err.message);
                setIsListening(false);
              }
            } else {
              setIsListening(false);
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };
    }

    // Speech Synthesis
    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;

      synthesisRef.current.onvoiceschanged = () => {
        // Voices loaded
      };

      synthesisRef.current.onend = () => {
        setIsSpeaking(false);
      };

      synthesisRef.current.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setLastError(`Speech synthesis error: ${event.error}`);
        setIsSpeaking(false);
      };
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Start listening
  const startListening = useCallback((options = {}) => {
    if (!recognitionRef.current) {
      setLastError('Speech recognition not supported in this browser');
      return false;
    }

    try {
      // Set language if provided
      if (options.language) {
        recognitionRef.current.lang = options.language;
      }

      // Set continuous/interim based on options
      recognitionRef.current.continuous = options.continuous !== false;
      recognitionRef.current.interimResults = options.interimResults !== false;

      recognitionRef.current.start();
      setIsListening(true);
      setLastError(null);
      return true;
    } catch (err) {
      console.error('Failed to start speech recognition:', err.message);
      setLastError(`Failed to start speech recognition: ${err.message}`);
      return false;
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping speech recognition:', err.message);
      }
      setIsListening(false);
      setLastError(null);
    }
  }, []);

  // Speak text
  const speakText = useCallback((text, options = {}) => {
    if (!synthesisRef.current) {
      setLastError('Speech synthesis not supported in this browser');
      return false;
    }

    if (!text || typeof text !== 'string') {
      setLastError('Invalid text provided for speech synthesis');
      return false;
    }

    try {
      // Cancel any ongoing speech
      synthesisRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Set properties from options
      if (options.language) utterance.lang = options.language;
      if (options.pitch !== undefined) utterance.pitch = Math.max(0, Math.min(2, options.pitch));
      if (options.rate !== undefined) utterance.rate = Math.max(0.1, Math.min(10, options.rate));
      if (options.volume !== undefined) utterance.volume = Math.max(0, Math.min(1, options.volume));

      // Set voice if specified
      if (options.voice) {
        const voices = synthesisRef.current.getVoices();
        const voice = voices.find(v => v.name === options.voice || v.lang === options.voice);
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setLastError(`Speech synthesis error: ${event.error}`);
        setIsSpeaking(false);
      };

      synthesisRef.current.speak(utterance);
      setIsSpeaking(true);
      setLastError(null);
      return true;
    } catch (err) {
      console.error('Failed to speak text:', err.message);
      setLastError(`Failed to speak text: ${err.message}`);
      setIsSpeaking(false);
      return false;
    }
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
      setLastError(null);
    }
  }, []);

  // Get available voices
  const getVoices = useCallback(() => {
    if (!synthesisRef.current) return [];
    return synthesisRef.current.getVoices();
  }, []);

  // Listen for voice commands (optional feature)
  const listenForCommands = useCallback((commandHandler, options = {}) => {
    if (!recognitionRef.current) {
      setLastError('Speech recognition not supported');
      return;
    }

    const handleResult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }

      if (transcript.trim()) {
        // Optionally stop listening after command
        if (options.autoStop !== false) {
          stopListening();
        }
        commandHandler(transcript.trim());
      }
    };

    // Temporarily override onresult for command handling
    const originalOnresult = recognitionRef.current.onresult;
    recognitionRef.current.onresult = handleResult;

    startListening(options);

    // Return cleanup function
    return () => {
      recognitionRef.current.onresult = originalOnresult;
      stopListening();
    };
  }, [startListening, stopListening]);

  return {
    // State
    isListening,
    isSpeaking,
    transcript,
    lastError,

    // Actions
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    listenForCommands,
    getVoices,

    // Reset
    clearTranscript: () => setTranscript(''),
    clearError: () => setLastError(null)
  };
};

export default useSpeech;