import { GoogleGenerativeAI, type GenerativeModel, type GenerateContentResult } from '@google/generative-ai';

// ============ CONFIG ============

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'gemini-2.0-flash';
const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '8192');

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!model) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required. Set it in .env');
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
      model: LLM_MODEL,
      generationConfig: {
        maxOutputTokens: LLM_MAX_TOKENS,
        temperature: 0.2, // low temp for code accuracy
      },
    });
  }
  return model;
}

// ============ CORE FUNCTIONS ============

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  model: string;
}

/**
 * Send a prompt to Gemini and get a text response.
 */
export async function callLLM(prompt: string, systemInstruction?: string): Promise<LLMResponse> {
  const m = getModel();

  const contents = [];

  if (systemInstruction) {
    contents.push({ role: 'user' as const, parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemInstruction}\n[END SYSTEM INSTRUCTION]\n\n${prompt}` }] });
  } else {
    contents.push({ role: 'user' as const, parts: [{ text: prompt }] });
  }

  const result: GenerateContentResult = await m.generateContent({ contents });
  const response = result.response;
  const text = response.text();

  // Estimate tokens (Gemini API doesn't always return exact counts)
  const tokensUsed = Math.ceil((prompt.length + text.length) / 4);

  return {
    text,
    tokensUsed,
    model: LLM_MODEL,
  };
}

/**
 * Send a structured prompt and parse JSON response.
 */
export async function callLLMJson<T>(prompt: string, systemInstruction?: string): Promise<{ data: T; tokensUsed: number }> {
  const response = await callLLM(prompt, systemInstruction);

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = response.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  // Try to parse
  try {
    const data = JSON.parse(jsonStr.trim()) as T;
    return { data, tokensUsed: response.tokensUsed };
  } catch (err) {
    throw new Error(`Failed to parse LLM JSON response: ${(err as Error).message}\nRaw response:\n${response.text.slice(0, 500)}`);
  }
}

/**
 * Estimate cost in USD based on token usage (Gemini pricing).
 * Gemini 2.0 Flash: ~$0.10 / 1M input tokens, ~$0.40 / 1M output tokens
 * We use a blended estimate.
 */
export function estimateCost(tokensUsed: number): number {
  const costPer1M = 0.25; // blended avg
  return (tokensUsed / 1_000_000) * costPer1M;
}
