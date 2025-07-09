import { batchArray } from "../lib/utils";
import { Clue } from "../models/Clue";
import { Entry } from "../models/Entry";
import { ObscurityResult } from "../models/ObscurityResult";
import { QualityResult } from "../models/QualityResult";
import { TranslateResult } from "../models/TranslateResult";
import { IAiProvider } from "./IAiProvider";
import fs from 'fs';

export async function getTranslateResults(provider: IAiProvider, clues: Clue[], lang: string): Promise<TranslateResult[]> {
  let results = [] as TranslateResult[];
  let prompt = await loadTranslatePromptAsync();

  try {
    let batches = batchArray(clues, 40);

    for (let batch of batches) {
      let promptData = batch.map(clue => `${clue.clue} : ${clue.entry}`).join('\n');
      let batchPrompt = prompt.replace('[[DATA]]', promptData);

      let resultText = await provider.generateResultsAsync(batchPrompt);
      const parsed = parseTranslateResponse(resultText);

      for (let i=0; i < parsed.length; i++) {
        const clue = batch[i];
        results.push(({
          clueId: clue.id,
          lang: lang,
          literalTranslation: parsed[i].literalTranslation,
          naturalTranslation: parsed[i].naturalTranslation,
          naturalAnswers: parsed[i].naturalAnswers,
          colloquialAnswers: parsed[i].colloquialAnswers,
          sourceAI: provider.sourceAI,
        }) as TranslateResult);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }

  return results;
}

export async function loadTranslatePromptAsync(): Promise<string> {
  try {
    const content: string = await fs.promises.readFile('./translate_prompt.txt', 'utf-8');
    return content;
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
}

export const parseTranslateResponse = (response: string): any[] => {
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

export async function getObscurityResults(provider: IAiProvider, entries: Entry[], lang: string): Promise<ObscurityResult[]> {
  let results = [] as ObscurityResult[];
  let prompt = await loadObscurityPromptAsync();

  try {
    let batches = batchArray(entries, 40) as Entry[][];

    for (let batch of batches) {
      let promptData = batch.map(entry => entry.entry).join('\n');
      let batchPrompt = prompt.replace('[[DATA]]', promptData);
      
      let resultText = await provider.generateResultsAsync(batchPrompt);
      const parsed = parseTranslateResponse(resultText);

      for (let i=0; i < parsed.length; i++) {
        const entry = batch[i];
        results.push(({
          entry: entry.entry,
          lang: lang,
          displayText: entry.displayText,
          entryType: entry.entryType,
          obscurityScore: entry.obscurityScore,
          sourceAI: provider.sourceAI,
        }) as ObscurityResult);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }

  return results;
}

export async function loadObscurityPromptAsync(): Promise<string> {
  try {
    const content: string = await fs.promises.readFile('./obscurity_prompt.txt', 'utf-8');
    return content;
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
}

export const parseObscurityResponse = (response: string): any[] => {
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

export async function getQualityResults(provider: IAiProvider, entries: Entry[], lang: string): Promise<QualityResult[]> {
  let results = [] as QualityResult[];
  let prompt = await loadQualityPromptAsync();

  try {
    let batches = batchArray(entries, 40) as Entry[][];

    for (let batch of batches) {
      let promptData = batch.map(entry => entry.entry).join('\n');
      let batchPrompt = prompt.replace('[[DATA]]', promptData);
      
      let resultText = await provider.generateResultsAsync(batchPrompt);
      const parsed = parseTranslateResponse(resultText);

      for (let i=0; i < parsed.length; i++) {
        const entry = batch[i];
        results.push(({
          entry: entry.entry,
          lang: lang,
          qualityScore: entry.qualityScore,
          sourceAI: provider.sourceAI,
        }) as QualityResult);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }

  return results;
}

export async function loadQualityPromptAsync(): Promise<string> {
  try {
    const content: string = await fs.promises.readFile('./quality_prompt.txt', 'utf-8');
    return content;
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
}

export const parseQualityResponse = (response: string): any[] => {
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

