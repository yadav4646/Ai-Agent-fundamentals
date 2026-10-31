import "dotenv/config";
import { streamText, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { tools } from "./tools/index.ts";
import { executeTool } from "./executeTools.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import type { AgentCallbacks } from "../types.ts";
import { getTracer, Laminar } from "@lmnr-ai/lmnr";

const MODEL_NAME = process.env.MODEL_NAME || "gemini/gemini-3.5-flash-lite";

const router = createOpenAI({
    baseURL: process.env.OPENAI_BASE_URL || "http://localhost:20128/v1",
    apiKey: process.env.OPENAI_API_KEY,
});

Laminar.initialize({
    projectApiKey: process.env.LMNR_PROJECT_API_KEY,
});

export const runAgent = async (
    userMessage: string,
    conversationHistory: ModelMessage[],
    callbacks: AgentCallbacks,
): Promise<ModelMessage[]> => {
    const messages: ModelMessage[] = [
        ...conversationHistory,
        { role: "user", content: userMessage },
    ];

    const result = streamText({
        model: router.chat(MODEL_NAME),
        messages,
        system: SYSTEM_PROMPT,
        tools,
        experimental_telemetry: {
            isEnabled: true,
            tracer: getTracer(),
        },
    });

    let fullResponse = "";

    for await (const textPart of result.textStream) {
        fullResponse += textPart;
        callbacks.onToken?.(textPart);
    }

    const toolCalls = await result.toolCalls;

    for (const toolCall of toolCalls) {
        const toolResult = await executeTool(toolCall.toolName, toolCall.input);

        console.log("Tool result:", toolResult);
    }

    callbacks.onComplete?.(fullResponse);

    return [...messages, { role: "assistant", content: fullResponse }];
};
