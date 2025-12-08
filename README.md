# Performance Ranking App

A Progressive Web App (PWA) for live performance ranking at musical ensemble contests. Built with React, Firebase (Firestore + Anonymous Auth), and MQTT for real-time contest status updates.

## Features

- **Contest Lineup Tab**: View ensembles in performance order with start times
- **My Rankings Tab**: Drag-and-drop interface to rank performers by preference
- **Anonymous Authentication**: Each user gets a unique ID via Firebase Anonymous Auth
- **Real-time Updates**: MQTT integration for contest status (submit button enabled when contest concludes)
- **Progressive Web App**: Installable on mobile devices (iOS & Android)
- **Responsive Design**: Optimized for cross-platform mobile and desktop use

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project
- MQTT broker (optional, for contest conclusion notifications)

## Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `fan-vote-71884`
3. Click the gear icon → Project Settings
4. Under "Your apps", click the web icon (`</>`) to register a web app
5. Copy the Firebase configuration object
6. Update `src/firebase.js` with your actual config values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "fan-vote-71884.firebaseapp.com",
  projectId: "fan-vote-71884",
  storageBucket: "fan-vote-71884.firebasestorage.app",
  messagingSenderId: "589593352663",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

### 2. Firestore Setup

1. In Firebase Console, go to Firestore Database
2. Create a collection called `contests`
3. Add a document with ID `1` (or any ID you prefer)
4. Structure your document like this:

```json
{
  "name": "DCI Tour Preview",
  "date": "June 26, 2026 at 12:00:00 AM UTC-5",
  "start_time": "June 26, 2026 at 8:00:00 PM UTC-5",
  "venue": "Scheumann Stadium",
  "address_1": "3300 Tillotson Avenue",
  "city": "Muncie",
  "state": "IN",
  "zip": "47306",
  "lineup": [
    {
      "performance_order": 1,
      "id_ensemble": 9,
      "time": "8:10 PM",
      "name": "Carolina Crown - Fort Mill, SC"
    },
    {
      "performance_order": 2,
      "id_ensemble": 39,
      "time": "8:28 PM",
      "name": "The Cavaliers - Rosemont, IL"
    }
  ]
}
```

5. The `rankings` collection will be created automatically when users submit their rankings

### 3. MQTT Configuration (Optional)

If you want to use MQTT to enable the submit button when the contest concludes:

1. Set up an MQTT broker (e.g., Mosquitto, HiveMQ Cloud)
2. Update `src/mqtt.js` with your broker details:

```javascript
const MQTT_CONFIG = {
  brokerUrl: 'ws://your-mqtt-broker:9001',
  topic: 'contests/+/status',
  options: {
    username: 'your-username', // if required
    password: 'your-password', // if required
  }
};
```

3. In `src/App.jsx`, uncomment line 67 to enable MQTT:

```javascript
// Change from:
// initMQTT();

// To:
initMQTT();
```

4. Your MQTT messages should follow this format:

```json
{
  "event_id": "A1B2C3D4",
  "start_timestamp_utc": "2024-10-27T14:30:00.123Z",
  "conclusion_timestamp_utc": "2024-10-27T14:30:15.876Z",
  "source_ip": "192.168.1.10"
}
```

### 4. Update Contest ID

In `src/App.jsx` (line 20), update the `contestId` to match your Firestore document ID:

```javascript
const contestId = '1'; // Change to your contest document ID
```

## Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open your browser to the URL shown (usually `http://localhost:5173`)

## Building for Production

1. Build the app:

```bash
npm run build
```

2. Preview the production build:

```bash
npm run preview
```

3. Deploy the `dist` folder to your hosting service (Firebase Hosting, Netlify, Vercel, etc.)

## Firebase Hosting Deployment

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Login to Firebase:

```bash
firebase login
```

3. Initialize Firebase Hosting:

```bash
firebase init hosting
```

- Select your Firebase project (`fan-vote-71884`)
- Set `dist` as your public directory
- Configure as a single-page app: Yes
- Don't overwrite `dist/index.html`

4. Deploy:

```bash
npm run build
firebase deploy --only hosting
```

## Project Structure

```
performance-ranking-app/
├── public/
│   └── manifest.json          # PWA manifest
├── src/
│   ├── components/
│   │   ├── ContestLineup.jsx  # Contest lineup tab
│   │   ├── ContestLineup.css
│   │   ├── MyRankings.jsx     # Rankings tab with drag-and-drop
│   │   ├── MyRankings.css
│   │   ├── SortableItem.jsx   # Draggable ranking item
│   │   └── SortableItem.css
│   ├── hooks/
│   │   └── useContest.js      # Custom hook for Firestore data
│   ├── App.jsx                # Main app component
│   ├── App.css
│   ├── firebase.js            # Firebase configuration
│   ├── mqtt.js                # MQTT integration
│   └── main.jsx
├── index.html
├── vite.config.js             # Vite + PWA configuration
└── package.json
```

## Technologies Used

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Firebase Firestore** - NoSQL database for contests and rankings
- **Firebase Auth** - Anonymous authentication
- **MQTT.js** - Real-time messaging for contest status
- **@dnd-kit** - Drag-and-drop functionality
- **vite-plugin-pwa** - Progressive Web App support

## How It Works

1. **User Opens App**: Automatically signs in anonymously via Firebase
2. **Contest Data Loads**: Fetches contest info from Firestore `contests` collection
3. **Contest Lineup Tab**: Displays ensembles in performance order with times
4. **My Rankings Tab**:
   - Shows ensembles in reverse performance order
   - User can drag-and-drop to reorder by preference
   - Submit button is disabled until contest concludes
5. **Contest Conclusion**:
   - MQTT message signals contest is over
   - Submit button becomes enabled
6. **Submit Rankings**:
   - Rankings saved to Firestore `rankings` collection
   - User sees confirmation message
   - Anonymous user ID and contest ID are stored with rankings

## Firestore Data Structure

### Collections

**contests**: Contest information
```
{
  id_contest: number,
  name: string,
  date: string,
  venue: string,
  lineup: [
    {
      performance_order: number,
      id_ensemble: number,
      name: string,
      time: string
    }
  ]
}
```

**rankings**: User-submitted rankings
```
{
  userId: string (anonymous Firebase UID),
  contestId: string,
  rankings: [
    {
      id_ensemble: number,
      rank: number
    }
  ],
  timestamp: string (ISO 8601)
}
```

## Mobile Installation

### iOS
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Android
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen"

## Development Notes

- The app uses Firebase Anonymous Auth, so each device gets a unique ID
- Rankings are submitted with the anonymous user ID to the `rankings` collection
- MQTT integration is optional; you can manually enable the submit button for testing
- The PWA is configured to cache Firebase API calls for better offline performance

## Support

For issues or questions, please refer to the Firebase and MQTT documentation:
- [Firebase Documentation](https://firebase.google.com/docs)
- [MQTT.js Documentation](https://github.com/mqttjs/MQTT.js)

## License

MIT
