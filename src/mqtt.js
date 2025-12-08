import mqtt from 'mqtt';

// MQTT Configuration
// TODO: Update these values when MQTT broker is set up
const MQTT_CONFIG = {
  brokerUrl: 'ws://YOUR_MQTT_BROKER:9001', // Update with actual broker URL
  topic: 'contests/+/status', // Update with actual topic pattern
  options: {
    // Add credentials if required
    // username: 'your-username',
    // password: 'your-password',
    clientId: `fan-vote-${Math.random().toString(16).substr(2, 8)}`,
    clean: true,
    reconnectPeriod: 5000,
  }
};

let client = null;
let messageCallback = null;

/**
 * Connect to MQTT broker
 * @param {Function} onMessage - Callback function when message is received
 * @returns {Promise<void>}
 */
export const connectMQTT = (onMessage) => {
  return new Promise((resolve, reject) => {
    try {
      messageCallback = onMessage;

      // Connect to broker
      client = mqtt.connect(MQTT_CONFIG.brokerUrl, MQTT_CONFIG.options);

      client.on('connect', () => {
        console.log('Connected to MQTT broker');

        // Subscribe to topic
        client.subscribe(MQTT_CONFIG.topic, (err) => {
          if (err) {
            console.error('Subscription error:', err);
            reject(err);
          } else {
            console.log(`Subscribed to ${MQTT_CONFIG.topic}`);
            resolve();
          }
        });
      });

      client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          console.log('MQTT message received:', { topic, payload });

          if (messageCallback) {
            messageCallback(payload);
          }
        } catch (error) {
          console.error('Error parsing MQTT message:', error);
        }
      });

      client.on('error', (error) => {
        console.error('MQTT error:', error);
        reject(error);
      });

      client.on('offline', () => {
        console.log('MQTT client offline');
      });

      client.on('reconnect', () => {
        console.log('MQTT client reconnecting...');
      });

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Disconnect from MQTT broker
 */
export const disconnectMQTT = () => {
  if (client) {
    client.end();
    client = null;
    messageCallback = null;
    console.log('Disconnected from MQTT broker');
  }
};

/**
 * Check if contest has concluded based on MQTT message
 * @param {Object} message - MQTT message payload
 * @returns {boolean}
 */
export const isContestConcluded = (message) => {
  if (!message || !message.conclusion_timestamp_utc) {
    return false;
  }

  const conclusionTime = new Date(message.conclusion_timestamp_utc);
  const now = new Date();

  return now >= conclusionTime;
};
