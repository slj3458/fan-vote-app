import React, { useMemo } from 'react';
import {
  formatResultsForTable,
  exportToCSV,
  exportToJSON,
  downloadFile
} from '../services/results';
import './ResultsTab.css';

/**
 * Results Tab Component
 * Displays Modified Borda Count results for the current contest
 * Shown after contest concludes and results are calculated
 */
const ResultsTab = ({ results, contest }) => {
  const tableData = useMemo(() => {
    if (results) {
      return formatResultsForTable(results);
    }
    return [];
  }, [results]);

  const handleExportCSV = () => {
    if (!results || tableData.length === 0) return;

    const csv = exportToCSV(tableData, {
      id_contest: results.id_contest,
      calculated_at: results.calculated_at,
      total_borda_points: results.total_borda_points
    });

    const filename = `contest_${results.id_contest}_scores_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename, 'text/csv');
  };

  const handleExportJSON = () => {
    if (!results) return;

    const json = exportToJSON(results);
    const filename = `contest_${results.id_contest}_scores_${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(json, filename, 'application/json');
  };

  // Get ensemble name by ID from contest lineup
  const getEnsembleName = (id_ensemble) => {
    if (!contest || !contest.lineup) return id_ensemble;
    const ensemble = contest.lineup.find(e => String(e.id_ensemble) === String(id_ensemble));
    return ensemble ? ensemble.name : id_ensemble;
  };

  if (!results) {
    return (
      <div className="results-tab">
        <div className="results-loading">
          Calculating results...
        </div>
      </div>
    );
  }

  // Calculate totals for table footer
  const totalBordaPoints = tableData.reduce((sum, row) => sum + row.borda_points, 0);
  const totalPercentage = tableData.reduce((sum, row) => sum + row.percentage, 0);
  const totalGEScore = tableData.reduce((sum, row) => sum + parseFloat(row.ge_score), 0);

  return (
    <div className="results-tab">
      <div className="results-header">
        <h2>Contest Results</h2>
        <p className="results-subtitle">Modified Borda Count Scores</p>
      </div>

      <div className="results-metadata">
        <div className="metadata-item">
          <span className="metadata-label">Total Votes:</span>
          <span className="metadata-value">{results.vote_count || 0}</span>
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
              <tr key={row.id_ensemble}>
                <td className="rank-cell">{row.rank}</td>
                <td className="ensemble-cell">{getEnsembleName(row.id_ensemble)}</td>
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

      <div className="export-section">
        <button
          className="export-btn csv"
          onClick={handleExportCSV}
          disabled={tableData.length === 0}
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
  );
};

export default ResultsTab;
