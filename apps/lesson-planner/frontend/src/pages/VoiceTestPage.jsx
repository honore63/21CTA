import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSpeech } from '../hooks/useSpeech';
import api from '../services/api';
import { FiMic, FiMicOff, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { AiOutlineRobot } from 'react-icons/ai';
import { RiErrorWarningLine, RiCheckboxCircleFill } from 'react-icons/ri';
import '../components/VoiceAssistant.css';

const VoiceTestPage = () => {
  const { user } = useAuth();
  const {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speakText,
    listenForCommands,
    clearTranscript,
    clearError
  } = useSpeech();

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

  // Test commands for development
  const handleTestCommand = async (command) => {
    setLastResponse({ type: 'listening', message: `Heard: "${command}"` });

    clearTranscript();
    setIsProcessing(true);

    try {
      const lowerCommand = command.toLowerCase().trim();

      if (lowerCommand.includes('generate lesson plan')) {
        // Mock response for testing
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLastResponse({
          type: 'success',
          message: 'Lesson plan generation started for the specified lesson.'
        });
        await speakText('Lesson plan generation has started. I will notify you when it is complete.');
      } else if (lowerCommand.includes('batch generate')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLastResponse({
          type: 'success',
          message: 'Batch generation started for the specified unit.'
        });
        await speakText('Batch generation has started. This will create lesson plans for all lessons in the unit.');
      } else if (lowerCommand.includes('analyze syllabus')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLastResponse({
          type: 'success',
          message: 'Syllabus analysis completed successfully.'
        });
        await speakText('I have finished analyzing the syllabus. The curriculum structure is now ready for use in lesson planning.');
      } else if (lowerCommand.includes('process materials')) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        setLastResponse({
          type: 'success',
          message: 'Reference materials processed successfully.'
        });
        await speakText('The reference materials have been processed and are ready to enhance your lesson plans.');
      } else if (lowerCommand.includes('status')) {
        setLastResponse({
          type: 'info',
          message: 'All systems operational. Ready to assist with lesson planning tasks.'
        });
        await speakText('All systems are operational. I am ready to help you with syllabus analysis, material processing, and lesson plan generation.');
      } else if (lowerCommand.includes('help') || lowerCommand.includes('what can you do')) {
        setLastResponse({
          type: 'info',
          message: 'Available commands: generate lesson plan, batch generate unit, analyze syllabus, process materials, check status, or ask for help.'
        });
        await speakText('You can ask me to generate lesson plans, batch generate units, analyze syllabi, process reference materials, check my status, or ask for help with available commands.');
      } else {
        setLastResponse({
          type: 'error',
          message: `Command not recognized: "${command}". Please try again.`
        });
        await speakText(`I'm not sure how to help with "${command}". Please try a different command or say "help" for available options.`);
      }
    } catch (error) {
      console.error('Test command error:', error);
      setLastResponse({
        type: 'error',
        message: `Error processing command: ${error.message}`
      });
      await speakText(`I encountered an error while processing your request: ${error.message}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="voice-test-page">
      <div className="voice-test-header">
        <h2>Voice Assistant Test Page</h2>
        <p>Test the AI Agent voice capabilities in a controlled environment</p>
      </div>

      <div className="voice-test-container">
        <div className="voice-assistant-display">
          <div className="voice-assistant-status">
            {isListening ? (
              <FiMic className="voice-mic-icon" />
            ) : isSpeaking ? (
              <FiMic className="voice-mic-icon" style={{ opacity: 0.7 }} />
            ) : (
              <FiMicOff className="voice-mic-icon" />
            )}
            <span className="voice-status-text">
              {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready for voice commands'}
            </span>
          </div>

          {transcript && (
            <div className="voice-transcript">
              <strong>Heard:</strong> "{transcript}"
            </div>
          )}

          {lastResponse && (
            <div className={`voice-last-response voice-${lastResponse.type}`}>
              {lastResponse.type === 'success' && <RiCheckboxCircleFill className="voice-response-icon" />}
              {lastResponse.type === 'error' && <RiErrorWarningLine className="voice-response-icon" />}
              {lastResponse.type === 'processing' && <FiMic className="voice-response-icon" spin />}
              {lastResponse.type === 'info' && <AiOutlineRobot className="voice-response-icon" />}
              <span className="voice-response-text">{lastResponse.message}</span>
            </div>
          )}
        </div>

        <div className="voice-test-controls">
          <h3>Test Controls:</h3>
          <div className="voice-test-button-group">
            <button
              onClick={() => startListening()}
              disabled={isListening || isProcessing}
              className="voice-test-btn-primary"
            >
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </button>

            <button
              onClick={() => speakText("Hello! I'm your AI lesson planning assistant. How can I help you today?")}
              disabled={isSpeaking || isProcessing}
              className="voice-test-btn-secondary"
            >
              Speak Greeting
            </button>

            <button
              onClick={() => clearError()}
              className="voice-test-btn-secondary"
            >
              Clear Error
            </button>

            <button
              onClick={() => clearTranscript()}
              className="voice-test-btn-secondary"
            >
              Clear Transcript
            </button>
          </div>

          <div className="voice-test-command-buttons">
            <h3>Test Commands:</h3>
            <div className="voice-test-command-grid">
              <button
                onClick={() => handleTestCommand("Generate lesson plan for lesson 5")}
                className="voice-test-command-btn"
              >
                Generate Lesson Plan
              </button>

              <button
                onClick={() => handleTestCommand("Batch generate unit 3")}
                className="voice-test-command-btn"
              >
                Batch Generate Unit
              </button>

              <button
                onClick={() => handleTestCommand("Analyze syllabus 2")}
                className="voice-test-command-btn"
              >
                Analyze Syllabus
              </button>

              <button
                onClick={() => handleTestCommand("Process materials for lesson 4")}
                className="voice-test-command-btn"
              >
                Process Materials
              </button>

              <button
                onClick={() => handleTestCommand("What's your status?")}
                className="voice-test-command-btn"
              >
                Check Status
              </button>

              <button
                onClick={() => handleTestCommand("What can you do?")}
                className="voice-test-command-btn"
              >
                Show Help
              </button>

              <button
                onClick={() => handleTestCommand("Help")}
                className="voice-test-command-btn"
              >
                Help
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="voice-test-info">
        <h3>About This Test:</h3>
        <p>This page tests the voice assistant functionality including:</p>
        <ul>
          <li>Speech recognition (microphone input)</li>
          <li>Speech synthesis (text-to-speech output)</li>
          <li>Command processing and routing</li>
          <li>Feedback and response handling</li>
        </ul>
        <p><strong>Note:</strong> This is a test implementation. In production, the voice assistant would be integrated throughout the application and connected to the actual AI agent backend services.</p>
      </div>
    </div>
  );
};

export default VoiceTestPage;