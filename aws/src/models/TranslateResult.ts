import { Clue } from "./Clue";

export interface TranslateResult {
    originalClue: Clue,
    translatedClueId?: string,
    literalTranslation: string,
    naturalTranslation: string,
    naturalAnswers: string[],
    colloquialAnswers: string[],
    sourceAI: string, // Which AI provided the translation
}
