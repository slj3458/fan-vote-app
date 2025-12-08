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
import { LocationService } from '../utils/geolocation';
import './MyRankings.css';

/**
 * My Rankings Component
 * Displays a drag-and-drop reorderable list of ensembles
 * Includes location verification and contest conclusion checks
 */
const MyRankings = ({
  contest,
  onSubmitRankings,
  contestConcluded,
  hasSubmitted
}) => {
  const [items, setItems] = useState([]);
  const [locationVerified, setLocationVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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

  const handleVerifyLocation = async () => {
    setIsVerifying(true);

    try {
      // Request permission if not granted
      const hasPermission = await LocationService.requestLocationPermission();

      if (!hasPermission) {
        setIsVerifying(false);
        showPermissionDeniedDialog();
        return;
      }

      // Verify location against venue
      if (!contest.venue_location) {
        alert('Venue location not configured for this contest');
        setIsVerifying(false);
        return;
      }

      const result = await LocationService.verifyEventPresence(
        contest.venue_location,
        200 // 200 yards radius
      );

      setIsVerifying(false);

      if (result.verified) {
        setLocationVerified(true);
        alert(`Location Verified! You are at the venue. You can now submit your rankings when the contest concludes.`);
      } else if (result.reason === 'outside_radius') {
        alert(`Location Verification Failed\n\nYou are ${result.distance.toFixed(0)} yards from the venue. You must be within 200 yards to submit rankings.`);
      } else {
        alert('Location Verification Failed\n\nUnable to verify your location. Please try again.');
      }
    } catch (error) {
      setIsVerifying(false);
      alert('Error: Failed to verify location. Please try again.');
    }
  };

  const showPermissionDeniedDialog = () => {
    const retry = window.confirm(
      "Location Permission Required\n\n" +
      "We're sorry, this application was specifically designed to gather feedback from contest attendees. " +
      "Without your location, we can't verify your attendance.\n\n" +
      "Click OK to try again, or Cancel to exit."
    );
    if (retry) {
      handleVerifyLocation();
    }
  };

  const handleSubmit = () => {
    if (!locationVerified) {
      alert('Please verify your location at the venue before submitting rankings.');
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

  // Can only submit when both location is verified AND contest has concluded
  const canSubmit = locationVerified && contestConcluded;

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
          <div className={`status-item ${locationVerified ? 'verified' : 'pending'}`}>
            <span className="status-icon">{locationVerified ? '✓' : '○'}</span>
            <span className="status-text">Location Verified</span>
          </div>
          <div className={`status-item ${contestConcluded ? 'verified' : 'pending'}`}>
            <span className="status-icon">{contestConcluded ? '✓' : '○'}</span>
            <span className="status-text">Contest Concluded</span>
          </div>
        </div>

        {!locationVerified && (
          <button
            className="verify-button"
            onClick={handleVerifyLocation}
            disabled={isVerifying}
          >
            {isVerifying ? 'Verifying Location...' : 'Verify My Location'}
          </button>
        )}

        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {canSubmit ? 'Submit Rankings' : 'Location & Contest Verification Required'}
        </button>

        {!canSubmit && (
          <p className="submit-info">
            {!locationVerified && !contestConcluded
              ? 'You must be at the venue and the contest must conclude before submitting.'
              : !locationVerified
              ? 'You must be at the venue to submit your rankings.'
              : 'The submit button will be enabled when the contest concludes.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default MyRankings;
