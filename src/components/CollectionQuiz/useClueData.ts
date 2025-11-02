import { useState, useEffect, useRef } from 'react';
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
  const hasLoadedInitialRef = useRef<string | null>(null);

  const loadInitialClues = async () => {
    if (!clueCollection?.id) return;
    
    // Prevent double-loading in React Strict Mode by checking and setting atomically
    const collectionId = clueCollection.id;
    if (hasLoadedInitialRef.current === collectionId) {
      return;
    }
    
    // Set immediately to prevent race conditions
    hasLoadedInitialRef.current = collectionId;
    
    try {
      setIsLoading(true);
      const clues = await CruziApi.getCollectionBatch(collectionId);
      setAllClues(clues);
    } catch (error) {
      console.error('Error loading initial clues:', error);
      // Only reset if this is still the current collection (in case ID changed during load)
      if (hasLoadedInitialRef.current === collectionId) {
        hasLoadedInitialRef.current = null; // Reset on error so it can retry
      }
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
      // Reset the ref when collection ID changes
      if (hasLoadedInitialRef.current !== clueCollection.id) {
        hasLoadedInitialRef.current = null;
        setAllClues([]); // Clear previous clues when switching collections
      }
      loadInitialClues();
    }
  }, [clueCollection?.id]);

  return {
    allClues,
    isLoading,
    isLoadingNextBatch,
    loadNextBatch,
  };
}

