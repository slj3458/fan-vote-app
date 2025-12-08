import React from 'react';
import './ContestLineup.css';

/**
 * Contest Lineup Component
 * Displays ensembles in performance order with start times
 */
const ContestLineup = ({ contest }) => {
  if (!contest || !contest.lineup) {
    return <div className="no-data">No contest data available</div>;
  }

  // Sort lineup by performance_order
  const sortedLineup = [...contest.lineup].sort(
    (a, b) => a.performance_order - b.performance_order
  );

  return (
    <div className="contest-lineup">
      <div className="contest-info">
        <h2>{contest.name}</h2>
        <div className="contest-details">
          <p><strong>Date:</strong> {contest.date}</p>
          <p><strong>Venue:</strong> {contest.venue}</p>
          <p><strong>Location:</strong> {contest.city}, {contest.state} {contest.zip}</p>
          {contest.address_1 && (
            <p><strong>Address:</strong> {contest.address_1}</p>
          )}
          <p><strong>Start Time:</strong> {contest.start_time}</p>
          {contest.url_contest_info && (
            <p>
              <a href={contest.url_contest_info} target="_blank" rel="noopener noreferrer">
                Contest Information
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="lineup-list">
        <h3>Performance Lineup</h3>
        {sortedLineup.map((ensemble) => (
          <div key={ensemble.id_ensemble} className="lineup-item">
            <div className="lineup-order">#{ensemble.performance_order}</div>
            <div className="lineup-details">
              <div className="ensemble-name">{ensemble.name}</div>
              <div className="performance-time">{ensemble.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContestLineup;
