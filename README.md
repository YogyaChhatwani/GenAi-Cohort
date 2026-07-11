## How the Project Works
The user enters a prompt via the CLI .The same prompt is sent in parallel to 3 models- Claude,OpenAi,Gemini using Promise.all().All the 3 responses are then evaluated by a judge model (Claude),identifies the strengths and weakness of all the responses and generates a single refined response .All the responses are displayed to the user in the CLI.

Application Type
This is a CLI application built with Node.js. The application keeps accepting prompts until the user types exit.

## AI Models Used

OpenAI – GPT-4o Mini -Response Generation 
Google Gemini – Gemini 2.5 Flash -Response Generation 
Anthropic claude-opus-4-8 – Response Generation

Claude Sonnet – Evaluation and Synthesis

## Steps to Execute the Project

1. Clone the repository.
2. Navigate to the project directory:
   cd Assignment2
3. Install the required dependencies:
   npm install
4. Create a ".env" file (take reference from .env.example ) and add your API keys for OpenAI, Gemini, and Claude.
5. Run the application:
   node index.js
6. Enter your prompt when prompted. Type "exit" to close the application.
 


## Self-Consistency Flow
This project follows a multi-model self-consistency approach. Instead of relying on a single AI model, it collects responses from multiple LLMs and uses Claude as an evaluator to compare, merge, and refine them into one final response.


       User Prompt
           │
           ▼
OpenAI   Gemini   Claude
      │      │      │
      └──────┼──────┘
             ▼
     Claude (Evaluator)
             ▼
 Final Synthesized Answer
