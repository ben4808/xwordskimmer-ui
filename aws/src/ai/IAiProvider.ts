import { Clue } from "../models/Clue";
import { Entry } from "../models/Entry";
import { ObscurityResult } from "../models/ObscurityResult";
import { QualityResult } from "../models/QualityResult";
import { TranslateResult } from "../models/TranslateResult";

export interface IAiProvider {
    sourceAI: string;

    populateTranslateResultsAsync(clues: Clue[], lang: string): Promise<void>;
    getObscurityResultsAsync(entries: Entry[], lang: string): Promise<ObscurityResult[]>;
    getQualityResultsAsync(entries: Entry[], lang: string): Promise<QualityResult[]>;

    generateResultsAsync(prompt: string): Promise<string>;
}
