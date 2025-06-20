import { Clue } from "./Clue";

export interface TranslateResult {
    originalClue: Clue,
    literalTranslation: string,
    naturalTranslation: string,
    naturalAnswers: string[],
    colloquialAnswers: string[],
}
