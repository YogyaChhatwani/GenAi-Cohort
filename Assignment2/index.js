import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
const geminiClient = new GoogleGenAI(process.env.GEMINI_API_KEY);



async function askOpenAI(prompt) {
  const response = await client.responses.create({
    input: prompt,
    model: "gpt-4o-mini",
  });
  //console.log(response.choices[0].message.content);
  return response.output_text;
}
async function askGemini(prompt){
    const response = await geminiClient.interactions.create({
        model: "gemini-2.5-flash",
        input: prompt,
    });
    console.log("Gemini response:",response.output_text);
    return response.output_text;
}
async function findBetterResponse(openAIResponse,geminiResponse,prompt){
    
    const judgePrompt = `
        You are an experienced Ai judge. You are given two responses to the same prompt.
        You need to judge which response is more accurate.
        Response 1: ${openAIResponse}
        Response 2: ${geminiResponse}
        Prompt: ${prompt}
        Judge the responses bases on the prompt and return the more accurate response.
        Rules:
        - A better response should be more accurate, concise, correct, consistent, coherent, and natural.
        - Merge the best parts of the two responses and return the final response.
        `;
        const judgeResponse = await client.responses.create({
            input: judgePrompt,
            model: "gpt-4o-mini",
            stream: true,
        })
    console.log("Judge response----------",judgeResponse);
    return judgeResponse.output_text;
}
async function main(){

    try{
        const prompt = "Which lamguage is more better for programming?";
        const [openAIResponse,geminiResponse] = await Promise.all([askOpenAI(prompt),askGemini(prompt)]);
        const judgeResponse = await findBetterResponse(openAIResponse,geminiResponse,prompt);
        console.log("OpenAI response:",openAIResponse);
        console.log("Gemini response:",geminiResponse);
        console.log("Judge response:",judgeResponse);
    }catch(error){
        console.error("Error:",error);
    }
}
main();
