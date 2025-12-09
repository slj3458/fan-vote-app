/**
 * GGWave Audio Authentication Service
 *
 * Uses data-over-sound technology to verify user attendance at contest venues.
 * The PA system broadcasts an encoded audio signal that this service decodes
 * to authenticate the user's physical presence.
 */

let ggwaveModule = null;
let ggwaveInstance = null;
let audioContext = null;
let mediaStream = null;
let recorder = null;
let isListening = false;

/**
 * Initialize the ggwave library
 * @returns {Promise<void>}
 */
async function initGGWave() {
  if (ggwaveModule) return;

  const ggwaveFactory = (await import('ggwave')).default;
  ggwaveModule = await ggwaveFactory();

  const parameters = ggwaveModule.getDefaultParameters();
  parameters.sampleRateInp = 48000;
  parameters.sampleRateOut = 48000;
  ggwaveInstance = ggwaveModule.init(parameters);
}

/**
 * Convert Float32Array audio samples to Int8Array for ggwave
 * @param {Float32Array} src - Source audio samples
 * @returns {Int8Array} - Converted samples
 */
function convertTypedArray(src) {
  const result = new Int8Array(src.length);
  for (let i = 0; i < src.length; i++) {
    // Convert from [-1, 1] float to [-128, 127] int8
    result[i] = Math.max(-128, Math.min(127, Math.floor(src[i] * 128)));
  }
  return result;
}

/**
 * Start listening for ggwave audio signals
 * @param {Object} options - Configuration options
 * @param {Function} options.onMessage - Callback when a message is decoded
 * @param {Function} options.onError - Callback on error
 * @param {Function} options.onStateChange - Callback for state changes
 * @returns {Promise<void>}
 */
export async function startListening({ onMessage, onError, onStateChange }) {
  if (isListening) {
    console.warn('Already listening for audio signals');
    return;
  }

  try {
    onStateChange?.('initializing');

    // Initialize ggwave if needed
    await initGGWave();

    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 48000
    });

    // Request microphone access with minimal processing
    // to preserve the audio signal for decoding
    const constraints = {
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        sampleRate: 48000
      }
    };

    onStateChange?.('requesting_permission');

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    mediaStream = audioContext.createMediaStreamSource(stream);

    // Create script processor for audio capture
    // Note: ScriptProcessorNode is deprecated but widely supported
    // and used in the official ggwave examples
    const bufferSize = 1024;
    recorder = audioContext.createScriptProcessor(bufferSize, 1, 1);

    recorder.onaudioprocess = (e) => {
      if (!isListening || !ggwaveInstance) return;

      const source = e.inputBuffer;
      const samples = new Float32Array(source.getChannelData(0));
      const convertedSamples = convertTypedArray(samples);

      try {
        const result = ggwaveModule.decode(ggwaveInstance, convertedSamples);

        if (result && result.length > 0) {
          const message = new TextDecoder('utf-8').decode(result);
          console.log('GGWave decoded message:', message);
          onMessage?.(message);
        }
      } catch (err) {
        console.error('GGWave decode error:', err);
      }
    };

    // Connect the audio pipeline
    mediaStream.connect(recorder);
    recorder.connect(audioContext.destination);

    isListening = true;
    onStateChange?.('listening');

    console.log('GGWave: Started listening for audio signals');

  } catch (error) {
    console.error('GGWave initialization error:', error);
    isListening = false;

    if (error.name === 'NotAllowedError') {
      onError?.('microphone_denied');
    } else if (error.name === 'NotFoundError') {
      onError?.('microphone_not_found');
    } else {
      onError?.('initialization_failed');
    }

    throw error;
  }
}

/**
 * Stop listening for audio signals
 */
export function stopListening() {
  if (!isListening) return;

  isListening = false;

  if (recorder) {
    recorder.disconnect();
    recorder = null;
  }

  if (mediaStream) {
    mediaStream.disconnect();
    mediaStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  console.log('GGWave: Stopped listening');
}

/**
 * Check if currently listening
 * @returns {boolean}
 */
export function getIsListening() {
  return isListening;
}

/**
 * Validate an authentication code
 * Expected format: "FANVOTE:<contest_id>:<code_type>:<timestamp>"
 * code_type: "AUTH" for attendance authentication
 *
 * @param {string} message - The decoded message
 * @param {string|number} expectedContestId - The expected contest ID
 * @returns {{valid: boolean, type?: string, contestId?: string, timestamp?: number, reason?: string}}
 */
export function validateAuthCode(message, expectedContestId) {
  if (!message || typeof message !== 'string') {
    return { valid: false, reason: 'empty_message' };
  }

  const parts = message.split(':');

  if (parts.length < 4) {
    return { valid: false, reason: 'invalid_format' };
  }

  const [prefix, contestId, codeType, timestamp] = parts;

  if (prefix !== 'FANVOTE') {
    return { valid: false, reason: 'invalid_prefix' };
  }

  if (contestId !== String(expectedContestId)) {
    return { valid: false, reason: 'contest_mismatch' };
  }

  if (codeType !== 'AUTH') {
    return { valid: false, reason: 'invalid_code_type' };
  }

  // Check timestamp is within reasonable window (5 minutes)
  const codeTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  const maxAge = 5 * 60; // 5 minutes

  if (isNaN(codeTime) || Math.abs(now - codeTime) > maxAge) {
    return { valid: false, reason: 'expired_code' };
  }

  return {
    valid: true,
    type: codeType,
    contestId,
    timestamp: codeTime
  };
}

/**
 * High-level authentication function
 * Listens for a valid authentication code for the specified duration
 *
 * @param {Object} options - Configuration
 * @param {string|number} options.contestId - The contest ID to validate against
 * @param {number} options.timeoutMs - How long to listen (default 30 seconds)
 * @param {Function} options.onStateChange - Callback for state updates
 * @returns {Promise<{authenticated: boolean, message?: string, reason?: string}>}
 */
export function authenticate({ contestId, timeoutMs = 30000, onStateChange }) {
  return new Promise((resolve) => {
    let resolved = false;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      stopListening();
    };

    const handleMessage = (message) => {
      if (resolved) return;

      const validation = validateAuthCode(message, contestId);

      if (validation.valid) {
        resolved = true;
        cleanup();
        resolve({
          authenticated: true,
          message
        });
      } else {
        // Log invalid messages but keep listening
        console.log('GGWave: Received invalid code:', validation.reason);
      }
    };

    const handleError = (error) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({
        authenticated: false,
        reason: error
      });
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();
      onStateChange?.('timeout');
      resolve({
        authenticated: false,
        reason: 'timeout'
      });
    }, timeoutMs);

    // Start listening
    startListening({
      onMessage: handleMessage,
      onError: handleError,
      onStateChange
    }).catch((error) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          authenticated: false,
          reason: error.name === 'NotAllowedError' ? 'microphone_denied' : 'initialization_failed'
        });
      }
    });
  });
}

// Export for testing/debugging
export const _internal = {
  initGGWave,
  convertTypedArray,
  getGGWaveInstance: () => ggwaveInstance
};
