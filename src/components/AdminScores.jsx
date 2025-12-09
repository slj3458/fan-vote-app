import React, { useState, useEffect } from 'react';
import {
  isUserAdmin,
  getAllContestResults,
  getContestResults,
  formatResultsForTable,
  exportToCSV,
  exportToJSON,
  downloadFile
} from '../services/admin';
import './AdminScores.css';

/**
 * Admin Scores Page
 * Displays pre-calculated Modified Borda Count results for contests
 * Access restricted to users in the admins collection
 */
const AdminScores = ({ user }) => {
  const [isAdmin, setIsAdmin] = useState(null); // null = checking, true/false = result
  const [contests, setContests] = useState([]);
  const [selectedContestId, setSelectedContestId] = useState('');
  const [results, setResults] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const adminStatus = await isUserAdmin(user.uid);
      setIsAdmin(adminStatus);

      if (adminStatus) {
        // Load available contests
        try {
          const contestList = await getAllContestResults();
          setContests(contestList);

          // Auto-select first contest if available
          if (contestList.length > 0) {
            setSelectedContestId(contestList[0].contest_id);
          }
        } catch {
          setError('Failed to load contest list');
        }
      }

      setLoading(false);
    };

    checkAdmin();
  }, [user]);

  // Load results when contest selection changes
  useEffect(() => {
    const loadResults = async () => {
      if (!selectedContestId) {
        setResults(null);
        setTableData([]);
        return;
      }

      try {
        setLoading(true);
        const contestResults = await getContestResults(selectedContestId);

        if (contestResults) {
          setResults(contestResults);
          setTableData(formatResultsForTable(contestResults));
        } else {
          setResults(null);
          setTableData([]);
          setError(`No results found for contest ${selectedContestId}`);
        }
      } catch {
        setError('Failed to load contest results');
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin && selectedContestId) {
      loadResults();
    }
  }, [selectedContestId, isAdmin]);

  const handleExportCSV = () => {
    if (!results || tableData.length === 0) return;

    const csv = exportToCSV(tableData, {
      contest_id: results.contest_id,
      calculated_at: results.calculated_at,
      total_borda_points: results.total_borda_points
    });

    const filename = `contest_${results.contest_id}_scores_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename, 'text/csv');
  };

  const handleExportJSON = () => {
    if (!results) return;

    const json = exportToJSON(results);
    const filename = `contest_${results.contest_id}_scores_${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(json, filename, 'application/json');
  };

  // Loading state
  if (loading && isAdmin === null) {
    return (
      <div className="admin-scores">
        <div className="admin-loading">Verifying admin access...</div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="admin-scores">
        <div className="admin-denied">
          <h2>Authentication Required</h2>
          <p>Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  // Not an admin
  if (isAdmin === false) {
    return (
      <div className="admin-scores">
        <div className="admin-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Calculate totals for table footer
  const totalBordaPoints = tableData.reduce((sum, row) => sum + row.borda_points, 0);
  const totalPercentage = tableData.reduce((sum, row) => sum + row.percentage, 0);
  const totalGEScore = tableData.reduce((sum, row) => sum + parseFloat(row.ge_score), 0);

  return (
    <div className="admin-scores">
      <header className="admin-header">
        <h1>Retrieve Scores</h1>
        <p className="admin-subtitle">Modified Borda Count Results</p>
      </header>

      <div className="admin-controls">
        <div className="contest-selector">
          <label htmlFor="contest-select">Select Contest:</label>
          <select
            id="contest-select"
            value={selectedContestId}
            onChange={(e) => setSelectedContestId(e.target.value)}
            disabled={contests.length === 0}
          >
            {contests.length === 0 ? (
              <option value="">No results available</option>
            ) : (
              contests.map((contest) => (
                <option key={contest.id} value={contest.contest_id}>
                  Contest {contest.contest_id}
                  {contest.calculated_at && ` - ${new Date(contest.calculated_at).toLocaleDateString()}`}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="export-buttons">
          <button
            className="export-btn csv"
            onClick={handleExportCSV}
            disabled={!results || tableData.length === 0}
          >
            Export CSV
          </button>
          <button
            className="export-btn json"
            onClick={handleExportJSON}
            disabled={!results}
          >
            Export JSON
          </button>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <div className="admin-loading">Loading results...</div>
      ) : results ? (
        <>
          <div className="results-metadata">
            <div className="metadata-item">
              <span className="metadata-label">Contest ID:</span>
              <span className="metadata-value">{results.contest_id}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Total Borda Points:</span>
              <span className="metadata-value">{results.total_borda_points}</span>
            </div>
            {results.calculated_at && (
              <div className="metadata-item">
                <span className="metadata-label">Calculated:</span>
                <span className="metadata-value">
                  {new Date(results.calculated_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Ensemble</th>
                  <th>Borda Pts</th>
                  <th>% of Total</th>
                  <th>GE Score</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row) => (
                  <tr key={row.ensemble_id}>
                    <td className="rank-cell">{row.rank}</td>
                    <td className="ensemble-cell">{row.ensemble_id}</td>
                    <td className="points-cell">{row.borda_points}</td>
                    <td className="percent-cell">{row.percentage.toFixed(2)}%</td>
                    <td className="ge-cell">{row.ge_score}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td colSpan="2">TOTAL</td>
                  <td className="points-cell">{totalBordaPoints}</td>
                  <td className="percent-cell">{totalPercentage.toFixed(2)}%</td>
                  <td className="ge-cell">{totalGEScore.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      ) : selectedContestId ? (
        <div className="no-results">No results found for this contest.</div>
      ) : (
        <div className="no-results">Select a contest to view results.</div>
      )}

      <footer className="admin-footer">
        <a href="/" className="back-link">Back to Fan Vote</a>
      </footer>
    </div>
  );
};

export default AdminScores;
