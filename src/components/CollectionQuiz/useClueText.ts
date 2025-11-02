import { useMemo } from 'react';
import { Clue } from '../../models/Clue';
import { User } from '../../models/User';
import { getExpectedResponse } from './quizHelpers';

/**
 * Select one example sentence for the current clue (when no custom clue)
 * This ensures the same sentence is used for clue text, translated clue, and expected response
 */
function useSelectedExampleSentence(clue: Clue | undefined, currentIndex: number) {
  return useMemo(() => {
    if (!clue || clue.customClue) return null;
    
    if (!clue.sense?.exampleSentences || clue.sense.exampleSentences.length === 0) {
      return null;
    }
    
    const clueLang = clue.entry?.lang || 'en';
    // Find example sentences with translation in clue language
    const matchingSentences = clue.sense.exampleSentences.filter(
      es => es.translations?.has(clueLang)
    );
    
    if (matchingSentences.length === 0) return null;
    
    // Randomly pick one (useMemo ensures this stays consistent for the same clue across renders)
    const randomIndex = Math.floor(Math.random() * matchingSentences.length);
    return matchingSentences[randomIndex];
  }, [clue, currentIndex]);
}

/**
 * Custom hook for getting clue text and translated clue
 */
export function useClueText(clue: Clue | undefined, user: User | undefined, currentIndex: number) {
  const selectedExampleSentence = useSelectedExampleSentence(clue, currentIndex);

  const clueText = useMemo(() => {
    if (!clue) return '';
    
    // If custom clue exists, use it
    if (clue.customClue) {
      return clue.customClue;
    }
    
    // No custom clue - use the selected example sentence
    if (selectedExampleSentence) {
      const clueLang = clue.entry?.lang || 'en';
      return selectedExampleSentence.translations?.get(clueLang) || '';
    }
    
    return '';
  }, [clue, selectedExampleSentence]);

  const translatedClue = useMemo(() => {
    if (!clue || clue.customClue || !selectedExampleSentence) return '';
    
    // Get translation in user's native language, or English if no user
    const targetLang = user?.nativeLang || 'en';
    return selectedExampleSentence.translations?.get(targetLang) || selectedExampleSentence.translations?.get('en') || '';
  }, [clue, selectedExampleSentence, user]);

  const expectedResponse = useMemo(() => {
    // Pass clueText to ensure we extract brackets from the same selected example sentence
    return getExpectedResponse(clue, clueText);
  }, [clue, clueText]);

  return {
    clueText,
    translatedClue,
    expectedResponse,
  };
}

