import { createDeepSeek } from "@ai-sdk/deepseek";

function getProvider() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Missing required env var: DEEPSEEK_API_KEY");
  return createDeepSeek({ apiKey });
}

export function aeonModel() {
  const id = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  return getProvider()(id);
}
