import React, { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FiMic, FiMicOff, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { AiOutlineRobot } from 'react-icons/ai';
import { RiErrorWarningLine, RiCheckboxCircleFill } from 'react-icons/ri';

const VoiceAssistant = () => {
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
  const [voiceCommandListener, setVoiceCommandListener] = useState(null);
  const [agentStatus, setAgentStatus] = useState({});

  // Fetch agent status from API
  const fetchAgentStatus = async () => {
    try {
      const response = await api.get('/api/agent/status');
      setAgentStatus(response.data.data || {});
    } catch (err) {
      console.warn('Could not fetch agent status:', err.message);
    }
  };

  // Poll job status until completion
  const pollJobStatus = async (jobId, taskName) => {
    let attempts = 0;
    const maxAttempts = 30; // Max 30 attempts (5 minutes with 10s intervals)

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await api.get(`/api/agent/status/${jobId}`);
        const status = statusResponse.data.data;

        if (status.status === 'completed') {
          // Get the result
          const resultResponse = await api.get(`/api/agent/result/${jobId}`);
          return {
            success: true,
            data: resultResponse.data.data
          };
        } else if (status.status === 'failed') {
          return {
            success: false,
            error: status.error || 'Task failed'
          };
        }

        // Still in progress, update waiting message
        if (attempts % 3 === 0) { // Update every 3 attempts (30 seconds)
          setLastResponse({
            type: 'processing',
            message: `${taskName} is still in progress... (${status.progress || 'working'})`
          });
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
        attempts++;
      } catch (err) {
        console.error(`Error polling job ${jobId}:`, err);
        // If we can't connect, assume it might still be working
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          attempts++;
          continue;
        }
        return {
          success: false,
          error: 'Failed to check job status'
        };
      }
    }

    return {
      success: false,
      error: 'Task timed out after 5 minutes'
    };
  };

  // Initialize voice command listener when component mounts
  useEffect(() => {
    // Set up continuous voice command listening for the assistant
    const cleanup = listenForCommands((command) => {
      handleVoiceCommand(command);
    }, { autoStop: false }); // Don't auto-stop so we can keep listening

    setVoiceCommandListener(cleanup);

    // Fetch initial agent status
    fetchAgentStatus();

    // Cleanup on unmount
    return () => {
      if (voiceCommandListener) {
        voiceCommandListener();
      }
      stopListening();
    };
  }, [listenForCommands, stopListening]);

  // Fetch agent status periodically
  useEffect(() => {
    const interval = setInterval(fetchAgentStatus, 10000); // Every 10 seconds
    fetchAgentStatus(); // Initial fetch

    return () => clearInterval(interval);
  }, []);

  // Handle recognized voice commands
  const handleVoiceCommand = async (command) => {
    setLastResponse({ type: 'listening', message: `Heard: "${command}"` });

    // Clear transcript after processing
    clearTranscript();

    // Process command
    setIsProcessing(true);
    try {
      const lowerCommand = command.toLowerCase().trim();

      // Define command patterns
      if (
        lowerCommand.includes('generate lesson plan') ||
        lowerCommand.includes('create lesson plan') ||
        lowerCommand.includes('make lesson plan')
      ) {
        // Extract lesson ID if mentioned
        const lessonIdMatch = command.match(/lesson\s*(\d+)/i);
        if (lessonIdMatch) {
          const lessonId = lessonIdMatch[1];
          await generateLessonPlanForLesson(lessonId);
        } else {
          await speakText("Please specify which lesson you'd like me to generate a plan for. You can say 'generate lesson plan for lesson 5' for example.");
        }
      } else if (
        lowerCommand.includes('batch generate') ||
        lowerCommand.includes('generate all') ||
        lowerCommand.includes('create all plans')
      ) {
        // Extract unit ID if mentioned
        const unitIdMatch = command.match(/unit\s*(\d+)/i);
        if (unitIdMatch) {
          const unitId = unitIdMatch[1];
          await batchGenerateUnitPlans(unitId);
        } else {
          await speakText("Please specify which unit you'd like me to batch generate plans for. You can say 'batch generate unit 3' for example.");
        }
      } else if (
        lowerCommand.includes('analyze syllabus') ||
        lowerCommand.includes('process syllabus') ||
        lowerCommand.includes('read syllabus')
      ) {
        // Extract syllabus ID if mentioned
        const syllabusIdMatch = command.match(/syllabus\s*(\d+)/i);
        if (syllabusIdMatch) {
          const syllabusId = syllabusIdMatch[1];
          await analyzeSyllabus(syllabusId);
        } else {
          await speakText("Please specify which syllabus you'd like me to analyze. You can say 'analyze syllabus 2' for example.");
        }
      } else if (
        lowerCommand.includes('process materials') ||
        lowerCommand.includes('prepare materials') ||
        lowerCommand.includes('get materials ready')
      ) {
        // Extract lesson ID if mentioned
        const lessonIdMatch = command.match(/lesson\s*(\d+)/i);
        if (lessonIdMatch) {
          const lessonId = lessonIdMatch[1];
          await processMaterialsForLesson(lessonId);
        } else {
          await speakText("Please specify which lesson materials you'd like me to process. You can say 'process materials for lesson 4' for example.");
        }
      } else if (
        lowerCommand.includes('status') ||
        lowerCommand.includes('how are you') ||
        lowerCommand.includes("what's up")
      ) {
        await speakAgentStatus();
      } else if (
        lowerCommand.includes('help') ||
        lowerCommand.includes('what can you do') ||
        lowerCommand.includes('capabilities')
      ) {
        await speakAgentCapabilities();
      } else if (
        lowerCommand.includes('stop') ||
        lowerCommand.includes('quiet') ||
        lowerCommand.includes('be silent')
      ) {
        await speakText("Okay, I'll be quiet. Let me know if you need anything.");
      } else if (
        lowerCommand.includes('thank you') ||
        lowerCommand.includes('thanks') ||
        lowerCommand.includes('appreciate')
      ) {
        await speakText("You're welcome! I'm here to help you prepare your lessons.");
      } else {
        // Unrecognized command
        await speakText(`I'm not sure how to help with "${command}". You can ask me to generate lesson plans, analyze syllabi, process materials, or check my status. Say "help" for more options.`);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      await speakText(`I encountered an error while processing your request: ${error.message}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Agent action functions
  const analyzeSyllabus = async (syllabusId) => {
    setLastResponse({ type: 'processing', message: `Analyzing syllabus ${syllabusId}...` });
    try {
      const response = await api.post(`/api/agent/syllabus/${syllabusId}/analyze`);
      const jobId = response.data.data.jobId;

      setLastResponse({
        type: 'processing',
        message: `Started analyzing syllabus ${syllabusId} (Job: ${jobId}). Checking status...`
      });
      await speakText(`I've started analyzing syllabus ${syllabusId}. Let me check on the progress for you.`);

      // Poll for job completion
      const result = await pollJobStatus(jobId, 'syllabus analysis');

      if (result.success) {
        setLastResponse({
          type: 'success',
          message: `Syllabus ${syllabusId} analysis completed successfully!`
        });
        await speakText(`I have finished analyzing syllabus ${syllabusId}. The curriculum structure is now ready for use in lesson planning.`);
      } else {
        setLastResponse({
          type: 'error',
          message: `Syllabus analysis failed: ${result.error || 'Unknown error'}`
        });
        await speakText(`I encountered an error while analyzing the syllabus: ${result.error || 'Unknown error'}. Please try again.`);
      }
    } catch (err) {
      setLastResponse({
        type: 'error',
        message: `Failed to start syllabus analysis: ${err.response?.data?.message || err.message}`
      });
      await speakText(`I had trouble starting the syllabus analysis: ${err.response?.data?.message || err.message}. Please try again or check your connection.`);
    }
  };

  const processMaterialsForLesson = async (lessonId) => {
    setLastResponse({ type: 'processing', message: `Processing materials for lesson ${lessonId}...` });
    try {
      const response = await api.post(`/api/agent/lesson/${lessonId}/process-materials`);
      const jobId = response.data.data.jobId;

      setLastResponse({
        type: 'processing',
        message: `Started processing materials for lesson ${lessonId} (Job: ${jobId}). Checking status...`
      });
      await speakText(`I've started processing the reference materials for lesson ${lessonId}. Let me check on the progress for you.`);

      // Poll for job completion
      const result = await pollJobStatus(jobId, 'material processing');

      if (result.success) {
        setLastResponse({
          type: 'success',
          message: `Materials for lesson ${lessonId} processed successfully!`
        });
        await speakText(`I have finished processing the reference materials for lesson ${lessonId}. This will help me create a better lesson plan for you.`);
      } else {
        setLastResponse({
          type: 'error',
          message: `Material processing failed: ${result.error || 'Unknown error'}`
        });
        await speakText(`I encountered an error while processing the materials: ${result.error || 'Unknown error'}. Please make sure you have reference materials uploaded for this lesson.`);
      }
    } catch (err) {
      setLastResponse({
        type: 'error',
        message: `Failed to start material processing: ${err.response?.data?.message || err.message}`
      });
      await speakText(`I had trouble processing the materials: ${err.response?.data?.message || err.message}. Please make sure you have reference materials uploaded for this lesson.`);
    }
  };

  const generateLessonPlanForLesson = async (lessonId) => {
    setLastResponse({ type: 'processing', message: `Generating lesson plan for lesson ${lessonId}...` });
    try {
      const response = await api.post(`/api/agent/lesson/${lessonId}/generate-plan`);
      const jobId = response.data.data.jobId;

      setLastResponse({
        type: 'processing',
        message: `Started generating lesson plan for lesson ${lessonId} (Job: ${jobId}). Checking status...`
      });
      await speakText(`I've started generating a lesson plan for lesson ${lessonId}. Let me check on the progress for you.`);

      // Poll for job completion
      const result = await pollJobStatus(jobId, 'lesson plan generation');

      if (result.success) {
        setLastResponse({
          type: 'success',
          message: `Lesson plan for lesson ${lessonId} generated successfully! You can now view it in the lesson plan page.`
        });
        await speakText(`I have finished generating the lesson plan for lesson ${lessonId}. You can now view and review it in the lesson plan page.`);
      } else {
        setLastResponse({
          type: 'error',
          message: `Lesson plan generation failed: ${result.error || 'Unknown error'}`
        });
        await speakText(`I encountered an error while generating the lesson plan: ${result.error || 'Unknown error'}. Please check that the lesson exists and you have the necessary permissions.`);
      }
    } catch (err) {
      setLastResponse({
        type: 'error',
        message: `Failed to start lesson plan generation: ${err.response?.data?.message || err.message}`
      });
      await speakText(`I had trouble starting the lesson plan generation: ${err.response?.data?.message || err.message}. Please check that the lesson exists and you have the necessary permissions.`);
    }
  };

  const batchGenerateUnitPlans = async (unitId) => {
    setLastResponse({ type: 'processing', message: `Batch generating plans for unit ${unitId}...` });
    try {
      const response = await api.post(`/api/agent/unit/${unitId}/batch-generate-plans`);
      const jobId = response.data.data.jobId;

      setLastResponse({
        type: 'processing',
        message: `Started batch generating lesson plans for unit ${unitId} (Job: ${jobId}). Checking status...`
      });
      await speakText(`I've started batch generating lesson plans for all lessons in unit ${unitId}. Let me check on the progress for you.`);

      // Poll for job completion
      const result = await pollJobStatus(jobId, 'batch unit plan generation');

      if (result.success) {
        setLastResponse({
          type: 'success',
          message: `Batch generation for unit ${unitId} completed successfully! ${result.data?.successful || 0} lesson plans were generated.`
        });
        await speakText(`I have finished batch generating lesson plans for unit ${unitId}. You can now view the generated lesson plans in the lesson plan pages.`);
      } else {
        setLastResponse({
          type: 'error',
          message: `Batch generation failed: ${result.error || 'Unknown error'}`
        });
        await speakText(`I encountered an error while batch generating the lesson plans: ${result.error || 'Unknown error'}. Please check that the unit exists and you have the necessary permissions.`);
      }
    } catch (err) {
      setLastResponse({
        type: 'error',
        message: `Failed to start batch generation: ${err.response?.data?.message || err.message}`
      });
      await speakText(`I had trouble starting the batch generation: ${err.response?.data?.message || err.message}. Please check that the unit exists and you have the necessary permissions.`);
    }
  };

  const speakAgentStatus = async () => {
    try {
      // Format a nice status message
      const statusParts = [];

      if (agentStatus.waiting !== undefined) {
        const totalWaiting = Object.values(agentStatus).reduce((sum, queue) =>
          sum + (queue.waiting || 0), 0);
        if (totalWaiting > 0) {
          statusParts.push(`${totalWaiting} tasks waiting in queue`);
        }
      }

      if (agentStatus.active !== undefined) {
        const totalActive = Object.values(agentStatus).reduce((sum, queue) =>
          sum + (queue.active || 0), 0);
        if (totalActive > 0) {
          statusParts.push(`${totalActive} tasks currently processing`);
        }
      }

      const statusMessage = statusParts.length > 0
        ? `Currently ${statusParts.join(', ')}.`
        : 'All systems are operational and ready for your commands.';

      setLastResponse({ type: 'info', message: statusMessage });
      await speakText(statusMessage);
    } catch (err) {
      await speakText("I'm having trouble checking my current status right now, but I'm ready to help you with lesson planning tasks.");
    }
  };

  const speakAgentCapabilities = async () => {
    const capabilitiesMessage = `I can help you with several tasks working in the background: I can analyze syllabi to understand the curriculum structure, process your reference materials to extract key information, generate individual lesson plans following REB guidelines, and batch generate all lesson plans for a unit. I can also notify you when tasks are complete. Just tell me what you need help with!`;

    setLastResponse({ type: 'info', message: capabilitiesMessage });
    await speakText(capabilitiesMessage);
  };

  // Manual test buttons (for development)
  const handleTestCommand = async (command) => {
    await handleVoiceCommand(command);
  };

  return (
    <div className="voice-assistant">
      <div className="voice-assistant-header">
        <AiOutlineRobot className="voice-assistant-icon" />
        <h3>AI Lesson Planning Assistant</h3>
        <div className="voice-assistant-status">
          {isListening ? (
            <>
              <FiMic className="voice-mic-icon" />
              <span className="voice-status-text">Listening...</span>
            </>
          ) : isSpeaking ? (
            <>
              <FiMic className="voice-mic-icon" style={{ opacity: 0.7 }} />
              <span className="voice-status-text">Speaking...</span>
            </>
          ) : (
            <>
              <FiMicOff className="voice-mic-icon" />
              <span className="voice-status-text">Ready for voice commands</span>
            </>
          )}
        </div>
      </div>

      <div className="voice-assistant-controls">
        <button
          onClick={() => startListening()}
          disabled={isListening || isProcessing}
          className="voice-control-btn"
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>

        <button
          onClick={() => speakText("Hello! I'm your AI lesson planning assistant. How can I help you today?")}
          disabled={isSpeaking || isProcessing}
          className="voice-control-btn"
        >
          Speak Greeting
        </button>

        <button
          onClick={() => clearError()}
          className="voice-control-btn secondary"
        >
          Clear Error
        </button>
      </div>

      {/* Transcript display */}
      {transcript && (
        <div className="voice-transcript">
          <strong>Heard:</strong> "{transcript}"
        </div>
      )}

      {/* Last response */}
      {lastResponse && (
        <div className={`voice-last-response voice-${lastResponse.type}`}>
          {lastResponse.type === 'success' && <RiCheckboxCircleFill className="voice-response-icon" />}
          {lastResponse.type === 'error' && <RiErrorWarningLine className="voice-response-icon" />}
          {lastResponse.type === 'processing' && <FiMic className="voice-response-icon" spin />}
          {lastResponse.type === 'listening' && <FiMic className="voice-response-icon" />}
          {lastResponse.type === 'info' && <AiOutlineRobot className="voice-response-icon" />}
          <span className="voice-response-text">{lastResponse.message}</span>
        </div>
      )}

      {/* Agent status panel */}
      {Object.keys(agentStatus).length > 0 && (
        <div className="voice-agent-status-panel">
          <h4>Agent Status</h4>
          <div className="agent-status-grid">
            {Object.entries(agentStatus).map(([queueName, stats]) => (
              <div key={queueName} className="agent-status-card">
                <h5>{queueName.charAt(0).toUpperCase() + queueName.slice(1)}</h5>
                {stats.waiting !== undefined && (
                  <div className="agent-status-item">
                    <span className="agent-status-label">Waiting:</span>
                    <span className="agent-status-value">{stats.waiting}</span>
                  </div>
                )}
                {stats.active !== undefined && (
                  <div className="agent-status-item">
                    <span className="agent-status-label">Active:</span>
                    <span className="agent-status-value">{stats.active}</span>
                  </div>
                )}
                {stats.completed !== undefined && (
                  <div className="agent-status-item">
                    <span className="agent-status-label">Completed:</span>
                    <span className="agent-status-value">{stats.completed}</span>
                  </div>
                )}
                {stats.failed !== undefined && (
                  <div className="agent-status-item">
                    <span className="agent-status-label">Failed:</span>
                    <span className="agent-status-value">{stats.failed}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Example commands */}
      <div className="voice-example-commands">
        <h4>Example Voice Commands:</h4>
        <ul>
          <li>"Generate lesson plan for lesson 5"</li>
          <li>"Batch generate unit 3"</li>
          <li>"Analyze syllabus 2"</li>
          <li>"Process materials for lesson 4"</li>
          <li>"What's your status?"</li>
          <li>"What can you do?"</li>
          <li>"Help"</li>
        </ul>
      </div>

      {/* Test buttons (remove in production) */}
      {/*
      <div className="voice-test-buttons">
        <h4>Test Commands:</h4>
        <div className="voice-test-grid">
          <button
            onClick={() => handleTestCommand("Generate lesson plan for lesson 1")}
            className="voice-test-btn"
          >
            Test Lesson Plan
          </button>

          <button
            onClick={() => handleTestCommand("Batch generate unit 1")}
            className="voice-test-btn"
          >
            Test Batch
          </button>

          <button
            onClick={() => handleTestCommand("Analyze syllabus 1")}
            className="voice-test-btn"
          >
            Test Syllabus
          </button>

          <button
            onClick={() => handleTestCommand("What's your status?")}
            className="voice-test-btn"
          >
            Test Status
          </button>
        </div>
      </div>
      */}
    </div>
  );
};

export default VoiceAssistant;