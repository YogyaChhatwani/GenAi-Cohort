import dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { Anthropic } from "@anthropic-ai/sdk";
import { input } from "@inquirer/prompts";

dotenv.config();
const openAiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const geminiClient = new GoogleGenAI(process.env.GEMINI_API_KEY);
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
async function synthesizeFinalOutput(openAIResponse, geminiResponse, claudeResponse, prompt) {

    const judgePrompt = `
        You are an expert Ai evaluator. You are given three responses to the same prompt..
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
    const judgeResponse = await claudeClient.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [
            {
                role: "user",
                content: judgePrompt,
            },
        ],
    });
    return judgeResponse.content[0].text;


}
function printSection(title, response) {
    console.log( "====================================", title, "===================================")
    console.log( response);
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
            const [openAIResponse, geminiResponse, claudeResponse] = await Promise.all([askOpenAI(prompt), askGemini(prompt), askClaude(prompt)]);
            const judgeResponse = await synthesizeFinalOutput(openAIResponse, geminiResponse, claudeResponse, prompt);
            printSection("🤖 OpenAI Response", openAIResponse);
            printSection("✨ Gemini Response", geminiResponse);
            printSection("🧠 Claude Response", claudeResponse);
            printSection("🏆 Final Response", judgeResponse);
        } catch (error) {
            console.error("Error:", error);
        }
    }
}
main();
