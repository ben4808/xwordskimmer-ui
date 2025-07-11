import { GoogleGenerativeAI } from '@google/generative-ai';
import settings from '../../settings.json';
import { Clue } from '../models/Clue';
import { IAiProvider } from './IAiProvider';
import { Entry } from '../models/Entry';
import { ObscurityResult } from '../models/ObscurityResult';
import { QualityResult } from '../models/QualityResult';
import { getObscurityResults, getQualityResults, getTranslateResults } from './common';
import { TranslateResult } from '../models/TranslateResult';

export class GeminiAiProvider implements IAiProvider {
  static genAI = new GoogleGenerativeAI(settings.gemini_api_key);
  static model = GeminiAiProvider.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  sourceAI = 'gemini';

  async getTranslateResultsAsync(clues: Clue[], originalLang: string, translatedLang: string): Promise<TranslateResult[]> {
    return await getTranslateResults(this, clues, originalLang, translatedLang);
  }

  async getObscurityResultsAsync(entries: Entry[], lang: string): Promise<ObscurityResult[]> {
    return await getObscurityResults(this, entries, lang);
  }

  async getQualityResultsAsync(entries: Entry[], lang: string): Promise<QualityResult[]> {
    return await getQualityResults(this, entries, lang);
  }

  async generateResultsAsync(prompt: string): Promise<string> {
    const result = await GeminiAiProvider.model.generateContent(prompt);
    const response = await result.response;

    return response.text();
  }
}
