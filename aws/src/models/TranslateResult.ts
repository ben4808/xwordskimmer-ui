export interface TranslateResult {
  translatedClueId?: string, // Optional, generated if not provided
  clueId: string,
  lang: string,
  literalTranslation: string,
  naturalTranslation: string,
  naturalAnswers: string[],
  colloquialAnswers: string[],
  sourceAI: string,
}
