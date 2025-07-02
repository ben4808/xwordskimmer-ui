export interface TranslateResult {
  sourceAI: string,
  lang: string,
  literalTranslation: string,
  naturalTranslation: string,
  naturalAnswers: string[],
  colloquialAnswers: string[],
}
