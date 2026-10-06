import dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { Anthropic } from "@anthropic-ai/sdk";
import { input } from "@inquirer/prompts";
import { TypeSafeClient, choice } from "@typesafe-ai/sdk";

dotenv.config();

function requireEnv(name) {
    if (!process.env[name]) {
        throw new Error(`${name} is not set in the environment variables`);
    }
}

requireEnv("OPENAI_API_KEY");
requireEnv("TYPESAFE_API_KEY");
requireEnv("GEMINI_API_KEY");
requireEnv("CLAUDE_API_KEY");

const openAiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const geminiClient = new GoogleGenAI(process.env.GEMINI_API_KEY);
const jevClient = new TypeSafeClient();
const claudeClient = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});


async function askOpenAI(prompt) {
    const response = await openAiClient.responses.create({
        input: prompt,
        model: "gpt-4o-mini",
    });
    return response.output_text;
}
async function askGemini(prompt) {
    const response = await geminiClient.interactions.create({
        model: "gemini-2.5-flash",
        input: prompt,
    });
    return response.output_text;
}
async function askClaude(prompt) {
    const response = await claudeClient.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1000,
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
    });
    return response.content[0].text;

}

const JUDGE_UNAVAILABLE_MESSAGE =
    "Could not synthesize a final answer (judge step failed). Check the error above and try again.";

async function callProvider(providerName, fn) {
    try {
        const text = await fn();
        return { provider: providerName, text, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${providerName} failed:`, message);
        return { provider: providerName, text: null, error: message };
    }
}

function responseOrPlaceholder(result) {
    if (result.text !== null) {
        return result.text;
    }
    return `[${result.provider} unavailable: ${result.error}]`;
}

async function synthesizeFinalOutput(openAIResponse, geminiResponse, claudeResponse, prompt) {

    const JUDGE_PROMPT = `
    You are an expert AI evaluator. You are given three responses to the same prompt..
    Response 1: ${openAIResponse}
    Response 2: ${geminiResponse}
    Response 3: ${claudeResponse}
    Prompt: ${prompt}
    Judge the responses based on the prompt and synthesize one final best answer .
    Rules:
    - A better response should be more factually accurate, precise, relevant, consistent,complete.
    - Identify strengths and weakness of each response and then synthesize the final output.
     -Do not copy any response for final output
    `;
    const timeElapsed = performance.now();
    try {
    const judgeResponse = await claudeClient.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [
            {
                role: "user",
                content: JUDGE_PROMPT,
            },
        ],
    });
        const timeTaken = performance.now() - timeElapsed;
        console.log("Time taken:", timeTaken, "milliseconds");
        const textBlock = judgeResponse.content.find((block) => block.type === "text");
        return textBlock?.text ?? null;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Judge synthesis failed:", message);
        return null;
    }


}

async function askJEV(prompt, openAiResponse, geminiResponse, claudeResponse) {

    const JUDGE_PROMPT = `
You are an expert Ai evaluator. You are given three responses to the same prompt..
Response 1: ${openAiResponse}
Response 2: ${geminiResponse}
Response 3: ${claudeResponse}
Prompt: ${prompt}
Judge the responses based on the prompt and synthesize one final best answer .
Rules:
- A better response should be more factually accurate, precise, relevant, consistent,complete.
- Identify strengths and weakness of each response and then synthesize the final output.
 -Do not copy any response for final output
`;
    const timeElapsed = performance.now();
    const response = await jevClient.systemOne({
        state: {
            "question": prompt,
            "openAiResponse": openAiResponse,
            "geminiResponse": geminiResponse,
            "claudeResponse": claudeResponse,
        },
        questions: {
            "judgement": {
                type: "choice",
                instructions: JUDGE_PROMPT,
                criteria: {
                    "Claude response": "The most accurate, precise, relevant, consistent,complete.",
                    "Gemini response": "The most accurate, precise, relevant, consistent,complete.",
                    "OpenAI response": "The most accurate, precise, relevant, consistent,complete.",
                }
            }
        }
    });
    const timeTaken = performance.now() - timeElapsed;
    console.log("Time taken:", timeTaken, "milliseconds");

    return response;
}
function printSection(title, response) {
    console.log("====================================", title, "===================================")
    console.log(response);
}
async function main() {
    while (true) {
        console.log("Enter 'exit' to exit the program");

        const prompt = await input({
            message: "Enter a prompt: ",
        })
        if (prompt.trim().toLowerCase() === "exit") {
            break;
        }
        try {
            const [openAIResult, geminiResult, claudeResult] = await Promise.all([
                callProvider("OpenAI", () => askOpenAI(prompt)),
                callProvider("Gemini", () => askGemini(prompt)),
                callProvider("Claude", () => askClaude(prompt)),
            ]);

            const anySucceeded = [openAIResult, geminiResult, claudeResult].some(
                (result) => result.text !== null,
            );
            if (!anySucceeded) {
                printSection(
                    "🏆 Final Response",
                    "All providers failed. Fix the errors above and try again.",
                );
                continue;
            }

            const openAIResponse = responseOrPlaceholder(openAIResult);
            const geminiResponse = responseOrPlaceholder(geminiResult);
            const claudeResponse = responseOrPlaceholder(claudeResult);

            //const judgeResponse = await askJEV(prompt, openAIResponse, geminiResponse, claudeResponse);
            const judgeResponse = await synthesizeFinalOutput(
                openAIResponse,
                geminiResponse,
                claudeResponse,
                prompt,
            );
            // printSection("🤖 OpenAI Response", openAIResponse);
            // printSection("✨ Gemini Response", geminiResponse);
            // printSection("🧠 Claude Response", claudeResponse);
            printSection("🏆 Final Response", judgeResponse ?? JUDGE_UNAVAILABLE_MESSAGE);
        } catch (error) {
            console.error("Error:", error);
        }
    }
}
main();
