import "dotenv/config";
import { streamText, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { tools } from "./tools/index.ts";
import { executeTool } from "./executeTools.ts";
import { SYSTEM_PROMPT } from "./system/prompt";
import type { AgentCallbacks } from "../types.ts";
import { getTracer, Laminar } from "@lmnr-ai/lmnr";
//
const MODEL_NAME = process.env.MODEL_NAME || "gemini/gemini-3.5-flash-lite";

const router = createOpenAI({
    baseURL: process.env.OPENAI_BASE_URL || "http://localhost:20128/v1",
    apiKey: process.env.OPENAI_API_KEY,
});
//
//
Laminar.initialize({
    projectApiKey: process.env.LMNR_PROJECT_API_KEY,
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
        tools,
        experimental_telemetry: {
            isEnabled: true,
            tracer: getTracer(),
        },
    });

    let fullResponse = "";

    for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
        fullResponse += textPart;
    }

    const toolCalls = await result.toolCalls;
    console.log("\nTool calls:", toolCalls);

    for (const toolCall of toolCalls) {
        console.log(await executeTool(toolCall.toolName, toolCall.input));
    }

    console.log();

    return fullResponse;
};

runAgent("What is the current time right now?", [], {} as AgentCallbacks)
    .catch((error) => {
        console.error("Agent error:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await Laminar.shutdown();
    });
