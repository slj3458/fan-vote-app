import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Calculate Modified Borda Count scores from rankings
 * Points = max_rank - rank + 1
 * GE Score = (Ensemble Borda Points / Total Borda Points) × 10.0
 *
 * @param {Array} rankings - Array of ranking documents from Firestore
 * @param {number} maxRank - Maximum rank (number of ensembles)
 * @returns {object} - Calculated scores
 */
export function calculateBordaCount(rankings, maxRank) {
  const bordaScores = {};
  let totalBordaPoints = 0;
  let voteCount = 0;

  // Process each ranking submission
  rankings.forEach((rankingDoc) => {
    const rankingData = rankingDoc.rankings || [];
    voteCount++;

    rankingData.forEach((item) => {
      const id_ensemble = String(item.id_ensemble);
      const rank = item.rank;
      const points = maxRank - rank + 1;

      if (!bordaScores[id_ensemble]) {
        bordaScores[id_ensemble] = 0;
      }
      bordaScores[id_ensemble] += points;
      totalBordaPoints += points;
    });
  });

  // Calculate GE scores (sum to 10.0)
  const geScores = {};
  Object.entries(bordaScores).forEach(([id_ensemble, points]) => {
    geScores[id_ensemble] = totalBordaPoints > 0
      ? parseFloat(((points / totalBordaPoints) * 10).toFixed(2))
      : 0;
  });

  return {
    borda_count_scores: bordaScores,
    general_effect_scores: geScores,
    total_borda_points: totalBordaPoints,
    vote_count: voteCount
  };
}

/**
 * Fetch rankings from Firestore and calculate results
 * @param {number} id_contest - Contest ID
 * @param {number} maxRank - Number of ensembles (for point calculation)
 * @returns {Promise<object>} - Calculated results
 */
export async function calculateContestResults(id_contest, maxRank) {
  try {
    // Fetch all rankings for this contest
    const rankingsRef = collection(db, 'rankings');
    const q = query(rankingsRef, where('id_contest', '==', id_contest));
    const snapshot = await getDocs(q);

    const rankings = [];
    snapshot.forEach((doc) => {
      rankings.push({
        id: doc.id,
        ...doc.data()
      });
    });

    if (rankings.length === 0) {
      return null;
    }

    // Calculate Borda Count
    const scores = calculateBordaCount(rankings, maxRank);

    return {
      id_contest,
      ...scores,
      calculated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating contest results:', error);
    throw error;
  }
}

/**
 * Save calculated results to Firestore
 * @param {object} results - Calculated results object
 * @returns {Promise<void>}
 */
export async function saveContestResults(results) {
  try {
    const docId = `contest_${results.id_contest}_borda`;
    await setDoc(doc(db, 'results', docId), results);
    console.log('Results saved to Firestore:', docId);
  } catch (error) {
    console.error('Error saving contest results:', error);
    throw error;
  }
}

/**
 * Calculate and save contest results (combined operation)
 * @param {number} id_contest - Contest ID
 * @param {number} maxRank - Number of ensembles
 * @returns {Promise<object>} - Calculated results
 */
export async function calculateAndSaveResults(id_contest, maxRank) {
  const results = await calculateContestResults(id_contest, maxRank);

  if (results) {
    await saveContestResults(results);
  }

  return results;
}

/**
 * Get contest results by contest ID
 * @param {number|string} id_contest - Contest ID
 * @returns {Promise<object|null>} - Contest results or null if not found
 */
export async function getContestResults(id_contest) {
  try {
    const docId = `contest_${id_contest}_borda`;
    const resultDoc = await getDoc(doc(db, 'results', docId));

    if (resultDoc.exists()) {
      return {
        id: resultDoc.id,
        ...resultDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching contest results:', error);
    throw error;
  }
}

/**
 * Format results data for display in table
 * @param {object} results - Raw results from Firestore
 * @returns {Array} - Formatted array for table display
 */
export function formatResultsForTable(results) {
  if (!results || !results.borda_count_scores) {
    return [];
  }

  const { borda_count_scores, general_effect_scores, total_borda_points } = results;

  const tableData = Object.entries(borda_count_scores).map(([id_ensemble, bordaPoints]) => {
    const geScore = general_effect_scores?.[id_ensemble] || 0;
    const percentage = total_borda_points > 0
      ? ((bordaPoints / total_borda_points) * 100).toFixed(2)
      : '0.00';

    return {
      id_ensemble,
      borda_points: bordaPoints,
      percentage: parseFloat(percentage),
      ge_score: typeof geScore === 'number' ? geScore.toFixed(2) : geScore
    };
  });

  // Sort by borda_points descending
  tableData.sort((a, b) => b.borda_points - a.borda_points);

  // Add rank
  return tableData.map((row, index) => ({
    rank: index + 1,
    ...row
  }));
}

/**
 * Export results to CSV format
 * @param {Array} tableData - Formatted table data
 * @param {object} metadata - Contest metadata
 * @returns {string} - CSV string
 */
export function exportToCSV(tableData, metadata = {}) {
  const headers = ['Rank', 'Ensemble ID', 'Borda Points', '% of Total', 'GE Score'];
  const rows = tableData.map(row => [
    row.rank,
    row.id_ensemble,
    row.borda_points,
    row.percentage,
    row.ge_score
  ]);

  let csv = '';

  // Add metadata header
  if (metadata.id_contest) {
    csv += `Contest ID,${metadata.id_contest}\n`;
  }
  if (metadata.calculated_at) {
    csv += `Calculated At,${metadata.calculated_at}\n`;
  }
  if (metadata.total_borda_points) {
    csv += `Total Borda Points,${metadata.total_borda_points}\n`;
  }
  csv += '\n';

  // Add table headers and data
  csv += headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.join(',') + '\n';
  });

  return csv;
}

/**
 * Export results to JSON format
 * @param {object} results - Raw results from Firestore
 * @returns {string} - JSON string
 */
export function exportToJSON(results) {
  return JSON.stringify(results, null, 2);
}

/**
 * Trigger file download
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
