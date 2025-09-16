import { GoogleGenAI, Type } from "@google/genai";
import { generateUUID } from './utils';
import type { TextQA } from '../types';

// This should be handled by the environment, but for this context, we check if it exists.
if (!process.env.API_KEY) {
  console.error("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const translateText = async (text: string): Promise<string> => {
  if (!process.env.API_KEY) return "Error: API Key not configured.";
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate the following Japanese text to natural-sounding English:\n\n${text}`,
    });
    return response.text;
  } catch (error) {
    console.error("Translation failed:", error);
    return "Translation failed.";
  }
};

const phraseExtractionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: 'The original Japanese phrase or vocabulary word.',
      },
      answer: {
        type: Type.STRING,
        description: 'The English translation of the Japanese phrase.',
      },
    },
    required: ['question', 'answer'],
  },
};

export const extractPhrases = async (text: string): Promise<TextQA[]> => {
    if (!process.env.API_KEY) return [];
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `From the following Japanese text, extract key phrases, vocabulary, and their English translations. Format them as question-answer pairs suitable for flashcards.

Japanese Text:
"${text}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: phraseExtractionSchema,
            },
        });

        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);

        if (Array.isArray(parsed)) {
            return parsed.map(item => ({
                id: generateUUID(),
                question: item.question || '',
                answer: item.answer || '',
            }));
        }
        return [];

    } catch (error) {
        console.error("Phrase extraction failed:", error);
        return [];
    }
};