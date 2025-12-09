import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Check if a user is an admin
 * @param {string} uid - Firebase user UID
 * @returns {Promise<boolean>} - True if user is an admin
 */
export async function isUserAdmin(uid) {
  if (!uid) return false;

  try {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    if (adminDoc.exists()) {
      const data = adminDoc.data();
      return data.role === 'admin';
    }
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get contest results by contest ID
 * @param {number|string} contestId - Contest ID
 * @returns {Promise<object|null>} - Contest results or null if not found
 */
export async function getContestResults(contestId) {
  try {
    const docId = `contest_${contestId}_borda`;
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
 * Get all available contest results
 * @returns {Promise<Array>} - Array of contest result summaries
 */
export async function getAllContestResults() {
  try {
    const resultsRef = collection(db, 'results');
    const snapshot = await getDocs(resultsRef);

    const results = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        contest_id: data.contest_id,
        calculated_at: data.calculated_at,
        total_borda_points: data.total_borda_points,
        vote_count: data.vote_count || Object.keys(data.borda_count_scores || {}).length
      });
    });

    // Sort by contest_id descending (most recent first)
    results.sort((a, b) => (b.contest_id || 0) - (a.contest_id || 0));

    return results;
  } catch (error) {
    console.error('Error fetching all contest results:', error);
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

  const tableData = Object.entries(borda_count_scores).map(([ensembleId, bordaPoints]) => {
    const geScore = general_effect_scores?.[ensembleId] || 0;
    const percentage = total_borda_points > 0
      ? ((bordaPoints / total_borda_points) * 100).toFixed(2)
      : '0.00';

    return {
      ensemble_id: ensembleId,
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
    row.ensemble_id,
    row.borda_points,
    row.percentage,
    row.ge_score
  ]);

  let csv = '';

  // Add metadata header
  if (metadata.contest_id) {
    csv += `Contest ID,${metadata.contest_id}\n`;
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
