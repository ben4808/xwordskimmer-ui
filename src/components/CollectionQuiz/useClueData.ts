import { useState, useEffect } from 'react';
import { Clue } from '../../models/Clue';
import { ClueCollection } from '../../models/ClueCollection';
import CruziApi from '../../api/CruziApi';

/**
 * Custom hook for managing clue data loading
 */
export function useClueData(clueCollection: ClueCollection | undefined) {
  const [allClues, setAllClues] = useState<Clue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNextBatch, setIsLoadingNextBatch] = useState(false);

  const loadInitialClues = async () => {
    if (!clueCollection?.id) return;
    
    try {
      setIsLoading(true);
      const clues = await CruziApi.getCollectionBatch(clueCollection.id);
      setAllClues(clues);
    } catch (error) {
      console.error('Error loading initial clues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextBatch = async () => {
    if (!clueCollection?.id || isLoadingNextBatch) return;
    
    try {
      setIsLoadingNextBatch(true);
      const newClues = await CruziApi.getCollectionBatch(clueCollection.id);
      setAllClues(prev => [...prev, ...newClues]);
    } catch (error) {
      console.error('Error loading next batch:', error);
    } finally {
      setIsLoadingNextBatch(false);
    }
  };

  useEffect(() => {
    if (clueCollection?.id) {
      loadInitialClues();
    }
  }, [clueCollection?.id]);

  return {
    allClues,
    setAllClues,
    isLoading,
    isLoadingNextBatch,
    loadNextBatch,
  };
}

