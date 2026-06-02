import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Reuses the proven aeon-rag pattern: Vertex Gemini behind an
// OpenAI-compatible gateway. One AI layer for RAG + coding + marketing.
function aiProvider() {
  const baseURL = process.env.AEON_AI_BASE_URL;
  const apiKey = process.env.AEON_AI_API_KEY;
  if (!baseURL) throw new Error("Missing required env var: AEON_AI_BASE_URL");
  if (!apiKey) throw new Error("Missing required env var: AEON_AI_API_KEY");
  return createOpenAICompatible({ name: "aeon", baseURL, apiKey });
}

export function aeonModel() {
  const id = process.env.AEON_AI_MODEL ?? "gemini-2.5-flash";
  return aiProvider()(id);
}
