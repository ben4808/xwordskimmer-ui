export interface QualityResult {
    entry: string;
    lang: string;
    displayText: string;
    qualityScore: number;
    sourceAI: string; // Which AI provided the quality score
}
