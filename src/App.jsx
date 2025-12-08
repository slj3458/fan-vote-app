import React, { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, signInAnonymous } from './firebase';
import { useContest } from './hooks/useContest';
import { connectMQTT, disconnectMQTT, isContestConcluded } from './mqtt';
import ContestLineup from './components/ContestLineup';
import MyRankings from './components/MyRankings';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('lineup');
  const [user, setUser] = useState(null);
  const [contestConcluded, setContestConcluded] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [error, setError] = useState(null);

  // Contest ID - matches Firestore document ID
  const contestId = 1;
  const { contest, loading, error: contestError } = useContest(contestId);

  // Initialize anonymous authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
          } else {
            // Sign in anonymously if not authenticated
            const newUser = await signInAnonymous();
            setUser(newUser);
          }
        });

        return () => unsubscribe();
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Failed to authenticate. Please refresh the page.');
      }
    };

    initAuth();
  }, []);

  // Initialize MQTT connection
  useEffect(() => {
    const initMQTT = async () => {
      try {
        await connectMQTT((message) => {
          console.log('MQTT message received:', message);
          // Check if contest has concluded
          if (isContestConcluded(message)) {
            setContestConcluded(true);
          }
        });
        setMqttConnected(true);
      } catch (err) {
        console.error('MQTT connection error:', err);
        // Don't show error to user if MQTT is not configured yet
        console.log('MQTT not configured. Contest conclusion will not be signaled.');
      }
    };

    // Uncomment when MQTT broker is configured
    // initMQTT();

    return () => {
      disconnectMQTT();
    };
  }, []);

  // Handle rankings submission
  const handleSubmitRankings = async (rankings) => {
    if (!user || !contest) {
      setError('Cannot submit: User not authenticated or contest not loaded');
      return;
    }

    try {
      // Submit rankings to Firestore
      await addDoc(collection(db, 'rankings'), {
        id_ranker: user.uid,
        id_contest: contest.id_contest,
        rankings: rankings,
        timestamp: new Date().toISOString(),
      });

      setHasSubmitted(true);
      console.log('Rankings submitted successfully');
      alert('Thank you! Your rankings have been submitted successfully.');
    } catch (err) {
      console.error('Error submitting rankings:', err);
      alert('Failed to submit rankings. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading contest data...</div>
      </div>
    );
  }

  if (contestError || error) {
    return (
      <div className="app">
        <div className="error">{contestError || error}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 Fan Vote</h1>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'lineup' ? 'active' : ''}`}
          onClick={() => setActiveTab('lineup')}
        >
          Contest Lineup
        </button>
        <button
          className={`tab ${activeTab === 'rankings' ? 'active' : ''}`}
          onClick={() => setActiveTab('rankings')}
        >
          My Rankings
        </button>
      </div>

      <main className="app-content">
        {activeTab === 'lineup' ? (
          <ContestLineup contest={contest} />
        ) : (
          <MyRankings
            contest={contest}
            onSubmitRankings={handleSubmitRankings}
            contestConcluded={contestConcluded}
            hasSubmitted={hasSubmitted}
          />
        )}
      </main>

      {/* Development info - remove in production */}
      <footer className="app-footer">
        <small>
          {user && `User ID: ${user.uid.slice(0, 8)}...`}
          {mqttConnected && ' | MQTT Connected'}
        </small>
      </footer>
    </div>
  );
}

export default App;
