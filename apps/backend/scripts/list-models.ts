import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
  try {
    const pager = await ai.models.list();
    console.log('Available models:');
    for await (const model of pager) {
      if (model.name?.includes('flash') || model.name?.includes('gemini')) {
        console.log(`- ${model.name} (${model.displayName})`);
      }
    }
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listModels();
