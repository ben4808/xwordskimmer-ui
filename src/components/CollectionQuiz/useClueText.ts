import { useMemo } from 'react';
import { ClueWithProgress, User } from 'cruzi-models';
import {
  getClueLanguage,
  getExpectedResponse,
  getTranslatedExampleSentence,
  getTranslatedExampleSentenceLanguage,
} from './quizHelpers';

function useSelectedExampleSentence(clue: ClueWithProgress | undefined, currentIndex: number) {
  return useMemo(() => {
    if (!clue || clue.customClue) return null;

    if (!clue.sense?.exampleSentences || clue.sense.exampleSentences.length === 0) {
      return null;
    }

    const clueLang = getClueLanguage(clue);
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
      return selectedExampleSentence.translations?.[getClueLanguage(clue)] || '';
    }

    return '';
  }, [clue, selectedExampleSentence]);

  const translatedClue = useMemo(() => {
    if (!clue || clue.customClue || !selectedExampleSentence) return '';

    const clueLang = getClueLanguage(clue);
    const translation = getTranslatedExampleSentence(
      selectedExampleSentence.translations,
      clueLang,
      user?.nativeLang
    );

    return translation === clueText ? '' : translation;
  }, [clue, selectedExampleSentence, user, clueText]);

  const translatedClueLang = useMemo(() => {
    if (!clue || clue.customClue || !selectedExampleSentence) return null;

    return getTranslatedExampleSentenceLanguage(
      selectedExampleSentence.translations,
      getClueLanguage(clue),
      user?.nativeLang
    );
  }, [clue, selectedExampleSentence, user]);

  const expectedResponse = useMemo(() => {
    return getExpectedResponse(clue, clueText);
  }, [clue, clueText]);

  return {
    clueText,
    translatedClue,
    translatedClueLang,
    expectedResponse,
  };
}
