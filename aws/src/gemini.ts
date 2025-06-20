import { GoogleGenerativeAI } from '@google/generative-ai';
import { TranslateResult } from './models/TranslateResult';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const getAnswerFromGemini = async (prompt: string): Promise<TranslateResult> => {
  try {
    const result = await model.generateContent(userQuestion);
    const response = await result.response;
  } catch (error) {
    console.error('Error:', error);
  } finally {
    return {
      answer: response.text,
      source: 'Gemini',
      model: 'gemini-2.5-flash',
      timestamp: new Date().toISOString()
    };
  }
};
