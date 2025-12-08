import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook to fetch contest data from Firestore
 * @param {string} contestId - The contest document ID
 * @returns {Object} { contest, loading, error }
 */
export const useContest = (contestId) => {
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContest = async () => {
      if (!contestId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const contestRef = doc(db, 'contests', contestId);
        const contestSnap = await getDoc(contestRef);

        if (contestSnap.exists()) {
          setContest({ id: contestSnap.id, ...contestSnap.data() });
          setError(null);
        } else {
          setError('Contest not found');
          setContest(null);
        }
      } catch (err) {
        console.error('Error fetching contest:', err);
        setError(err.message);
        setContest(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContest();
  }, [contestId]);

  return { contest, loading, error };
};
