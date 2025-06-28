import { GoogleGenerativeAI } from '@google/generative-ai';
import { TranslateResult } from './models/TranslateResult';
import settings from '../settings.json';
import { Clue } from './models/Clue';
import { batchArray, loadPromptAsync } from './lib/utils';

const genAI = new GoogleGenerativeAI(settings.gemini_api_key);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export const getTranslationsFromGemini = async (clues: Clue[]): Promise<TranslateResult[]> => {
  let results = [] as TranslateResult[];
  let prompt = await loadPromptAsync();

  try {
    let batches = batchArray(clues, 40);

    for (let batch of batches) {
      let promptData = batch.map(clue => `${clue.clue} : ${clue.entry}`).join('\n');
      let batchPrompt = prompt.replace('[[DATA]]', promptData);
      
      const result = await model.generateContent(batchPrompt);
      const response = await result.response;

      const parsed = parseGeminiResponse(response.text());
      for (let i=0; i < parsed.length; i++) {
        const clue = batch[i];
        results.push({
          originalClue: batch[i],
          literalTranslation: parsed[i].literalTranslation,
          naturalTranslation: parsed[i].naturalTranslation,
          naturalAnswers: parsed[i].naturalAnswers,
          colloquialAnswers: parsed[i].colloquialAnswers,
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }

  return results;
};

const parseGeminiResponse = (response: string): any[] => {
  const results: any[] = [];
  const lines = response.split('\n').filter(line => line.trim() !== '');

  for (let i = 0; i < lines.length; i+=5) {
    const parts = lines.slice(i, i + 5);
    results.push({
      literalTranslation: parts[1].split(':')[1].trim(),
      naturalTranslation: parts[2].split(':')[1].trim(),
      naturalAnswers: parts[3].split(':')[1].trim().split(';').map(answer => answer.trim()),
      colloquialAnswers: parts[4].split(':')[1].trim().split('j').map(answer => answer.trim()),
    });
  }

  return results;
}
