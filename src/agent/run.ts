import "dotenv/config";
import { streamText, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { SYSTEM_PROMPT } from "./system/prompt";
import type { AgentCallbacks } from "../types.ts";

const MODEL_NAME = process.env.MODEL_NAME || "gemini/gemini-3.5-flash-lite";

const router = createOpenAI({
    baseURL: process.env.OPENAI_BASE_URL || "http://localhost:20128/v1",
    apiKey: process.env.OPENAI_API_KEY,
});

export const runAgent = async (
    userMessage: string,
    conversationHistory: ModelMessage[],
    callbacks: AgentCallbacks,
) => {
    const result = streamText({
        model: router.chat(MODEL_NAME),
        prompt: userMessage,
        system: SYSTEM_PROMPT,
    });

    let fullResponse = "";

    for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
        fullResponse += textPart;
    }

    console.log();

    return fullResponse;
};

runAgent("Hello can you hear me?", [], {} as AgentCallbacks).catch((error) => {
    console.error("Agent error:", error);
    process.exitCode = 1;
});
