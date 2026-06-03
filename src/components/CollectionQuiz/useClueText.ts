import { useMemo } from 'react';
import { ClueWithProgress, User } from 'cruzi-models';
import { getExpectedResponse } from './quizHelpers';

function useSelectedExampleSentence(clue: ClueWithProgress | undefined, currentIndex: number) {
  return useMemo(() => {
    if (!clue || clue.customClue) return null;

    if (!clue.sense?.exampleSentences || clue.sense.exampleSentences.length === 0) {
      return null;
    }

    const clueLang = clue.entry.lang || 'en';
    const matchingSentences = clue.sense.exampleSentences.filter(
      (es) => es.translations && clueLang in es.translations
    );

    if (matchingSentences.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * matchingSentences.length);
    return matchingSentences[randomIndex];
  }, [clue, currentIndex]);
}

export function useClueText(clue: ClueWithProgress | undefined, user: User | undefined, currentIndex: number) {
  const selectedExampleSentence = useSelectedExampleSentence(clue, currentIndex);

  const clueText = useMemo(() => {
    if (!clue) return '';

    if (clue.customClue) {
      return clue.customClue;
    }

    if (selectedExampleSentence) {
      const clueLang = clue.entry.lang || 'en';
      return selectedExampleSentence.translations?.[clueLang] || '';
    }

    return '';
  }, [clue, selectedExampleSentence]);

  const translatedClue = useMemo(() => {
    if (!clue || clue.customClue || !selectedExampleSentence) return '';

    const targetLang = user?.nativeLang || 'en';
    return (
      selectedExampleSentence.translations?.[targetLang] ||
      selectedExampleSentence.translations?.['en'] ||
      ''
    );
  }, [clue, selectedExampleSentence, user]);

  const expectedResponse = useMemo(() => {
    return getExpectedResponse(clue, clueText);
  }, [clue, clueText]);

  return {
    clueText,
    translatedClue,
    expectedResponse,
  };
}
