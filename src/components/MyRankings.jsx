import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { authenticate, stopListening } from '../services/ggwave';
import './MyRankings.css';

/**
 * My Rankings Component
 * Displays a drag-and-drop reorderable list of ensembles
 * Includes audio-based attendance verification and contest conclusion checks
 */
const MyRankings = ({
  contest,
  onSubmitRankings,
  contestConcluded,
  hasSubmitted
}) => {
  const [items, setItems] = useState([]);
  const [attendanceVerified, setAttendanceVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationState, setVerificationState] = useState(null);

  // Initialize items in reverse performance order (last performer first)
  useEffect(() => {
    if (contest && contest.lineup) {
      const sortedLineup = [...contest.lineup].sort(
        (a, b) => b.performance_order - a.performance_order
      );
      setItems(sortedLineup.map((ensemble, index) => ({
        id: ensemble.id_ensemble.toString(),
        name: ensemble.name,
        originalIndex: index
      })));
    }
  }, [contest]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Set up sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleVerifyAttendance = async () => {
    setIsVerifying(true);
    setVerificationState('initializing');

    try {
      const contestId = contest.id_contest || contest.id;

      const result = await authenticate({
        contestId,
        timeoutMs: 30000, // 30 seconds
        onStateChange: (state) => {
          setVerificationState(state);
        }
      });

      setIsVerifying(false);

      if (result.authenticated) {
        setAttendanceVerified(true);
        setVerificationState('verified');
        alert('Attendance Verified! You can now submit your rankings when the contest concludes.');
      } else {
        setVerificationState('failed');
        handleVerificationFailure(result.reason);
      }
    } catch (error) {
      setIsVerifying(false);
      setVerificationState('failed');
      console.error('Verification error:', error);
      alert('Error: Failed to verify attendance. Please try again.');
    }
  };

  const handleVerificationFailure = (reason) => {
    switch (reason) {
      case 'microphone_denied':
        showPermissionDeniedDialog();
        break;
      case 'microphone_not_found':
        alert('No microphone found. Please ensure your device has a working microphone and try again.');
        break;
      case 'timeout':
        alert('Verification Timeout\n\nNo authentication signal was detected. Please make sure:\n\n• You are at the venue\n• The PA system is broadcasting\n• Your device volume is not muted');
        break;
      default:
        alert('Attendance Verification Failed\n\nUnable to verify your attendance. Please try again.');
    }
  };

  const handleCancelVerification = () => {
    stopListening();
    setIsVerifying(false);
    setVerificationState(null);
  };

  const showPermissionDeniedDialog = () => {
    const retry = window.confirm(
      "Microphone Permission Required\n\n" +
      "We're sorry, this application was specifically designed to gather feedback from contest attendees. " +
      "Without microphone access, we can't verify your attendance at the venue.\n\n" +
      "The microphone is only used briefly to listen for the venue's authentication signal.\n\n" +
      "Click OK to try again, or Cancel to exit."
    );
    if (retry) {
      handleVerifyAttendance();
    }
  };

  const handleSubmit = () => {
    if (!attendanceVerified) {
      alert('Please verify your attendance at the venue before submitting rankings.');
      return;
    }
    if (!contestConcluded) {
      alert('Please wait until the contest concludes before submitting rankings.');
      return;
    }

    // Create array of rankings (index positions)
    const rankings = items.map((item, index) => ({
      id_ensemble: parseInt(item.id),
      rank: index + 1
    }));
    onSubmitRankings(rankings);
  };

  const getVerificationStateText = () => {
    switch (verificationState) {
      case 'initializing':
        return 'Initializing audio...';
      case 'requesting_permission':
        return 'Requesting microphone access...';
      case 'listening':
        return 'Listening for authentication signal...';
      case 'timeout':
        return 'Verification timed out';
      case 'verified':
        return 'Attendance verified!';
      case 'failed':
        return 'Verification failed';
      default:
        return '';
    }
  };

  // Can only submit when both attendance is verified AND contest has concluded
  const canSubmit = attendanceVerified && contestConcluded;

  if (!contest || !contest.lineup) {
    return <div className="no-data">No contest data available</div>;
  }

  if (hasSubmitted) {
    return (
      <div className="submission-confirmation">
        <div className="confirmation-icon">✓</div>
        <h2>Thank you for your vote!</h2>
        <p>Your rankings have been successfully submitted.</p>
      </div>
    );
  }

  return (
    <div className="my-rankings">
      <div className="rankings-header">
        <h2>My Rankings</h2>
        <p className="instructions">
          Drag and drop to reorder the ensembles by your preference.
          Your top choice should be at the top of the list.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="rankings-list">
            {items.map((item, index) => (
              <SortableItem
                key={item.id}
                id={item.id}
                rank={index + 1}
                name={item.name}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="submit-section">
        <div className="verification-status">
          <div className={`status-item ${attendanceVerified ? 'verified' : 'pending'}`}>
            <span className="status-icon">{attendanceVerified ? '✓' : '○'}</span>
            <span className="status-text">Attendance Verified</span>
          </div>
          <div className={`status-item ${contestConcluded ? 'verified' : 'pending'}`}>
            <span className="status-icon">{contestConcluded ? '✓' : '○'}</span>
            <span className="status-text">Contest Concluded</span>
          </div>
        </div>

        {!attendanceVerified && !isVerifying && (
          <button
            className="verify-button"
            onClick={handleVerifyAttendance}
          >
            Verify My Attendance
          </button>
        )}

        {isVerifying && (
          <div className="verification-progress">
            <div className="listening-indicator">
              <span className="pulse"></span>
              <span className="state-text">{getVerificationStateText()}</span>
            </div>
            <button
              className="cancel-button"
              onClick={handleCancelVerification}
            >
              Cancel
            </button>
          </div>
        )}

        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {canSubmit ? 'Submit Rankings' : 'Attendance & Contest Verification Required'}
        </button>

        {!canSubmit && (
          <p className="submit-info">
            {!attendanceVerified && !contestConcluded
              ? 'You must verify your attendance and the contest must conclude before submitting.'
              : !attendanceVerified
              ? 'You must verify your attendance at the venue to submit your rankings.'
              : 'The submit button will be enabled when the contest concludes.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default MyRankings;
