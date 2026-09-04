import "dotenv/config";
import { OpenAIClient } from "@anvia/openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY is required. Copy .env.example to .env and fill in the key.",
  );
}

const client = new OpenAIClient({
  apiKey,
  baseUrl: process.env.OPENAI_BASE_URL,
});

export const model = client.completionModel({
  modelId: process.env.MODEL_ID ?? "openai/gpt-5.6-luna",
  api: "chat",
});

