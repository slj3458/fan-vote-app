# Fan Vote App

A Progressive Web App (PWA) for live performance ranking at musical ensemble contests (e.g., DCI drum corps competitions). Users can view contest lineups and submit their personal rankings of performers.

## Tech Stack

- **Frontend**: React 19 with Vite 7
- **Database**: Firebase Firestore
- **Authentication**: Firebase Anonymous Auth
- **Attendance Verification**: GGWave (data-over-sound)
- **Real-time Messaging**: MQTT.js for contest status updates
- **Drag-and-Drop**: @dnd-kit/core and @dnd-kit/sortable
- **PWA**: vite-plugin-pwa with Workbox
- **Mobile**: Capacitor 7 for Android deployment
- **Hosting**: Firebase Hosting

## Project Structure

```
fan-vote-app/
├── src/
│   ├── components/
│   │   ├── ContestLineup.jsx    # Displays ensembles in performance order
│   │   ├── ContestLineup.css
│   │   ├── MyRankings.jsx       # Drag-and-drop ranking interface
│   │   ├── MyRankings.css
│   │   ├── ResultsTab.jsx       # Results display (shown after contest concludes)
│   │   ├── ResultsTab.css
│   │   ├── SortableItem.jsx     # Individual draggable ranking item
│   │   └── SortableItem.css
│   ├── hooks/
│   │   └── useContest.js        # Custom hook for Firestore contest data
│   ├── services/
│   │   ├── ggwave.js            # Audio-based attendance verification
│   │   └── results.js           # Borda Count calculation and results queries
│   ├── App.jsx                  # Main app with tabs and auth
│   ├── App.css
│   ├── firebase.js              # Firebase configuration and auth helpers
│   ├── mqtt.js                  # MQTT connection and message handling
│   ├── main.jsx                 # React entry point
│   └── index.css                # Global styles
├── public/
│   ├── manifest.json            # PWA manifest
│   └── vite.svg
├── android/                     # Capacitor Android project
├── firebase.json                # Firebase Hosting configuration
├── vite.config.js               # Vite + PWA configuration
└── package.json
```

## Key Concepts

### Attendance Verification (GGWave)

The app uses [ggwave](https://github.com/ggerganov/ggwave) data-over-sound technology to verify user attendance at venues. The PA system broadcasts an encoded audio signal that the app decodes via the device microphone.

**How it works:**
1. User taps "Verify My Attendance"
2. App requests microphone permission
3. App listens for authentication signal (30 second timeout)
4. PA system broadcasts encoded message: `FANVOTE:<id_contest>:AUTH:<timestamp>`
5. App decodes and validates the message
6. Attendance is verified, enabling ranking submission

**Authentication Code Format:**
```
FANVOTE:1:AUTH:1703548800
```
- `FANVOTE` - Protocol prefix
- `1` - Contest ID (id_contest)
- `AUTH` - Code type (authentication)
- `1703548800` - Unix timestamp (must be within 5 minutes)

**Key files:**
- `src/services/ggwave.js` - Audio capture, decoding, and validation
- `src/components/MyRankings.jsx` - UI integration

### Results Tab

The Results tab displays Modified Borda Count scores after the contest concludes. It is hidden until the contest ends and results are calculated.

**Behavior:**
- Tab is hidden during the contest
- When contest concludes (via MQTT), scores are automatically calculated
- Results are saved to Firestore `results` collection
- Results tab becomes visible on the far right
- All users can view results (no admin access required)

**Features:**
- Results table with Rank, Ensemble Name, Borda Points, % of Total, GE Score
- CSV and JSON export options
- Ensemble names resolved from contest lineup

**Modified Borda Count Algorithm:**
```
Points = max_rank - rank + 1
GE Score = (Ensemble Borda Points / Total Borda Points) × 10.0
```

Example with 3 ensembles:
- Rank 1 = 3 points, Rank 2 = 2 points, Rank 3 = 1 point
- GE scores always sum to 10.0

**Key files:**
- `src/services/results.js` - Borda calculation, Firestore queries, export functions
- `src/components/ResultsTab.jsx` - Results display UI

### Contest Data Model (Firestore)

All ID fields follow the `id_****` naming convention.

**Collection: `contests`**
```json
{
  "id_contest": 1,
  "name": "DCI Tour Preview",
  "date": "June 26, 2026",
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
    }
  ]
}
```

**Collection: `rankings`**
```json
{
  "id_ranker": "firebase-anonymous-uid",
  "id_contest": 1,
  "rankings": [
    { "id_ensemble": 9, "rank": 1 },
    { "id_ensemble": 39, "rank": 2 }
  ],
  "timestamp": "2024-10-27T14:30:00.000Z"
}
```

**Collection: `results`** (auto-calculated on contest conclusion)
```json
{
  "id_contest": 1,
  "total_borda_points": 30,
  "borda_count_scores": { "9": 14, "39": 10, "24": 6 },
  "general_effect_scores": { "9": 4.67, "39": 3.33, "24": 2.00 },
  "calculated_at": "2025-11-27T20:00:00.000Z",
  "vote_count": 5
}
```
Document ID = `contest_{id_contest}_borda`

### Application Flow

1. User opens app → Firebase Anonymous Auth signs them in automatically
2. Contest data loads from Firestore via `useContest` hook
3. **Contest Lineup tab**: Shows ensembles in performance order with times
4. **My Rankings tab**: User drags/drops ensembles to rank by preference
5. User taps "Verify My Attendance" → listens for PA audio signal
6. Submit button is disabled until BOTH:
   - Attendance is verified (via ggwave audio)
   - Contest has concluded (signaled via MQTT)
7. Rankings are saved to Firestore with user's anonymous UID
8. When contest concludes:
   - Results are calculated from all submitted rankings
   - Results are saved to Firestore `results` collection
   - **Results tab** becomes visible (far right)
9. All users can view final results and export them

### MQTT Integration

MQTT is used to signal when a contest has concluded, enabling the submit button and triggering results calculation. The message format expected:

```json
{
  "event_id": "A1B2C3D4",
  "start_timestamp_utc": "2024-10-27T14:30:00.123Z",
  "conclusion_timestamp_utc": "2024-10-27T14:30:15.876Z",
  "source_ip": "192.168.1.10"
}
```

MQTT is currently disabled in `App.jsx` (line 71). Uncomment `initMQTT()` to enable.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Firebase Deployment

```bash
firebase login
npm run build
firebase deploy --only hosting
```

## Configuration

### Firebase Setup

The Firebase project is `fan-vote-71884`. Configuration is in `src/firebase.js`. Ensure:
- Firestore Database is enabled
- Anonymous Authentication is enabled in Firebase Console
- Firestore security rules allow anonymous users to read contests, rankings, results and write rankings

### Contest ID

The active contest ID is set in `src/App.jsx` line 24:
```javascript
const contestId = 1;
```

### MQTT Broker

Configure MQTT broker URL in `src/mqtt.js`:
```javascript
const MQTT_CONFIG = {
  brokerUrl: 'ws://YOUR_MQTT_BROKER:9001',
  topic: 'contests/+/status',
  // ...
};
```

## Testing Notes

- **Attendance verification**: For local testing, you can temporarily set `attendanceVerified` to `true` in `MyRankings.jsx`
- **Contest conclusion**: For local testing without MQTT, manually set `contestConcluded` state to `true` in `App.jsx`
- **Results tab testing**: Setting `contestConcluded` to `true` will trigger results calculation and show the Results tab
- **Audio testing**: Use the [ggwave web demo](https://ggwave.ggerganov.com/) to generate test signals
- Firebase Anonymous Auth works locally but requires proper domain configuration for production
- PWA features (install prompt, offline support) only work on HTTPS or localhost
- Microphone access requires HTTPS in production (localhost is exempt)

## Venue Setup (PA System)

To broadcast authentication codes from the venue PA system:

1. Use a device/computer connected to the PA audio input
2. Generate authentication codes using ggwave encode function
3. Broadcast at the start of the event and periodically throughout
4. Code format: `FANVOTE:<id_contest>:AUTH:<unix_timestamp>`

Example code generation (Node.js):
```javascript
const ggwave = require('ggwave');

ggwave().then((gw) => {
  const params = gw.getDefaultParameters();
  const instance = gw.init(params);

  const id_contest = 1;
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `FANVOTE:${id_contest}:AUTH:${timestamp}`;

  // Generate waveform (audible protocol, volume 10)
  const waveform = gw.encode(instance, message, gw.TxProtocolId.GGWAVE_TX_PROTOCOL_AUDIBLE_FAST, 10);

  // waveform is Int8Array of audio samples at 48kHz
  // Play through PA system audio output
});
```

## Common Tasks

### Add a new ensemble field
1. Update Firestore contest document with new field in lineup array
2. Update `ContestLineup.jsx` to display the field
3. Update `SortableItem.jsx` if it should appear in rankings

### Change ranking submission logic
- Modify `handleSubmitRankings` function in `App.jsx`

### Modify authentication code validation
- Edit `validateAuthCode` function in `src/services/ggwave.js`

### Change listening timeout
- Modify `timeoutMs` parameter in `handleVerifyAttendance` in `MyRankings.jsx` (default: 30000ms)

### Update PWA configuration
- Edit `vite.config.js` under the `VitePWA` plugin options

### Build Android APK
```bash
npm run build
npx cap sync android
npx cap open android  # Opens Android Studio
```

### Modify results calculation
- Edit `calculateBordaCount` function in `src/services/results.js`

### Force results recalculation
1. Delete the existing results document from `results/contest_{id}_borda` in Firestore
2. Trigger contest conclusion again (or set `contestConcluded` to `true` in dev)

## Security Considerations

- Firebase API keys in `src/firebase.js` are client-side keys (safe to expose)
- Actual security is handled by Firestore Security Rules (configure in Firebase Console)
- Anonymous users can only write to `rankings` collection, not modify `contests`
- Authentication codes expire after 5 minutes to prevent replay attacks
- Audio authentication requires physical presence at the venue (can hear the PA)
- Results are publicly readable after contest conclusion (no admin restriction)
