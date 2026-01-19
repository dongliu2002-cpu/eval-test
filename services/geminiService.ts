
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, Language } from '../types';

/**
 * Shuffles an array in place using the Fisher-Yates (aka Knuth) algorithm.
 * @param array The array to shuffle.
 * @returns The shuffled array.
 */
const shuffleArray = <T>(array: T[]): T[] => {
  if (!array) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getPromptAndSchema = (language: Language) => {
  let prompt: string;
  const baseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        questionText: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctAnswer: { type: Type.STRING },
        level: {},
        contextSentence: { type: Type.STRING, description: "An optional sentence providing context for the question text." },
      },
      required: ['questionText', 'options', 'correctAnswer', 'level'],
    },
  };

  let responseSchema = { ...baseSchema };

  switch (language) {
    case 'ielts':
      prompt = `Generate 30 multiple-choice English vocabulary questions to evaluate a user's IELTS level. The questions should cover a mix of IELTS bands from 4.0 to 8.0. For each question, provide an English word or phrase as questionText, four possible English definitions or synonyms as options, identify the correct option, and specify the IELTS band (a number from 4.0 to 9.0) of the vocabulary word. For approximately half of the questions, also provide a contextSentence that uses the questionText word in a natural context. Ensure options are plausible but only one is correct.`;
      responseSchema.items.properties.level = {
        type: Type.NUMBER,
        description: 'The IELTS band of the question, a number from 4.0 to 9.0.',
      };
      break;

    case 'dele':
      prompt = `Generate 30 multiple-choice Spanish vocabulary questions to evaluate a user's DELE level. The questions should cover a mix of all DELE levels from A1 to C2. For each question, provide a Spanish word or phrase as questionText, four possible Spanish definitions or synonyms as options, identify the correct option, and specify the DELE level (a string like "A1", "B2", etc.) of the vocabulary word. For approximately half of the questions, also provide a contextSentence that uses the questionText word in a natural context. Ensure options are plausible but only one is correct.`;
      responseSchema.items.properties.level = {
        type: Type.STRING,
        description: 'The DELE level of the question, a string like "A1", "B2", etc.',
      };
      break;
    
    case 'hsk':
    default:
      prompt = `Generate 30 multiple-choice Chinese vocabulary questions to evaluate a user's HSK level. The questions should cover a mix of all HSK levels from 1 to 6, with approximately 5 questions per level. For each question, provide a Chinese word or phrase as questionText, four possible Chinese definitions or synonyms as options, identify the correct option, and specify the HSK level (a number from 1 to 6) of the vocabulary word. For approximately half of the questions, also provide a contextSentence that uses the questionText word in a natural context. Ensure options are plausible but only one is correct.`;
      responseSchema.items.properties.level = {
        type: Type.INTEGER,
        description: 'The HSK level of the question, a number from 1 to 6.',
      };
      break;
  }
  return { prompt, responseSchema };
}


export const generateQuizQuestions = async (language: Language): Promise<Question[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const { prompt, responseSchema } = getPromptAndSchema(language);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const responseText = response.text.trim();
    if (!responseText) {
        throw new Error("Received empty response from AI model.");
    }
    const questions: Question[] = JSON.parse(responseText);

    const processedQuestions = questions.map(q => ({
      ...q,
      options: shuffleArray(q.options),
    }));

    // Validate that options array always has 4 items, and the correct answer is one of them.
    return processedQuestions.filter((q: Question) => 
        q.options && q.options.length === 4 && q.options.includes(q.correctAnswer)
    );

  } catch (error) {
    console.error("Error generating quiz questions:", error);
    throw new Error("Failed to communicate with the AI model. Please check your API key and try again.");
  }
};

export const generatePronunciation = async (text: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    // All browser-based API calls require an API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from the API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating pronunciation:", error);
        throw new Error("Failed to generate pronunciation audio.");
    }
};
