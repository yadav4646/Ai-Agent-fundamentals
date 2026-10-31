import type {
    EvalData,
    SingleTurnResult,
    MultiTurnEvalData,
    MultiTurnResult,
} from "./types.ts";
import { generateText, stepCountIs, tool, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import z from "zod";
import { buildMessages } from "./utils.ts";

const TOOL_DEFINITIONS: any = {
    readFile: {
        description: "Read the content of a file at a specified path",
        paramerter: z.object({
            path: z
                .string()
                .describe("the path to the file that you want to read"),
        }),
    },
    writeFile: {
        description: "Write given content to a file at a specified path",
        paramerter: z.object({
            path: z
                .string()
                .describe("the path to the file that you want to write to"),
            constent: z
                .string()
                .describe("the content you want to write to the file"),
        }),
    },
    listFile: {
        description: "List all the files in the directory",
        paramerter: z.object({
            path: z
                .string()
                .describe(
                    "the path the directory in which you want to list the files",
                ),
        }),
    },
    deleteFile: {
        description: "delete the file at a specified path",
        paramerter: z.object({
            path: z
                .string()
                .describe("the path to the file that you want to delete"),
        }),
    },
    runCommand: {
        description: "Execute a shell command and return its output",
        paramerter: z.object({
            command: z.string().describe("the shell command to Execute"),
        }),
    },
};

export const singleTurnExecutorWithMocks = async (data: EvalData) => {
    //Building the messages
    const messages = buildMessages(data);
    //Dynamically creating tools
    const tools: ToolSet = {};
    for (const toolName of data.tools) {
        const def = TOOL_DEFINITIONS[toolName];
        console.log(def);

        if (def) {
            tools[toolName] = tool({
                description: def.description,
                inputSchema: def.paramerter,
            });
        }
    }
    //Calling the LLM
    const { toolCalls } = await generateText({
        model: openai(data.config?.model ?? "undefined"),
        messages,
        tools,
        stopWhen: stepCountIs(1),
        temperature: data.config?.temperature ?? undefined,
    });
    //Extracting tool calls
    const calls = toolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: "args" in tc ? tc.args : {},
    }));
    const toolName = toolCalls.map((tc) => tc.toolName);
    //Returning the evaluation result
    return {
        toolCalls,
        toolName,
        selectedAny: toolName.length > 0,
    };
};
