import { API_KEY, API_URL, AI_MODEL } from '../config.js';

export default class LLMService {
    constructor() {
        this.systemPrompt = "You are a helpful assistant in a video game.";
    }

    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
    }

    async sendChat(userMessage, history = []) {
        if (!API_KEY || API_KEY.includes("YOUR_")) {
            console.error("LLMService: Invalid API Key. Please update js/config.js");
            return "Minion: *Coughs* (I need a valid API Key in config.js to speak!)";
        }

        // Gemini uses 'contents' array with 'role' ("user" or "model") and 'parts'
        // It doesn't support system prompts directly in messages typically the same way, 
        // but we can prepend it to the first user message or use the new system instruction if available.
        // For simplicity/compatibility with Flash, we'll prepend context.

        let contents = [];

        // Add history (mapped to Gemini format)
        // Note: Gemini roles are 'user' and 'model' (not 'assistant')
        history.forEach(msg => {
            const role = msg.role === 'assistant' ? 'model' : 'user';
            contents.push({
                role: role,
                parts: [{ text: msg.content }]
            });
        });

        // Add current message with system prompt prepended for context
        // (If strict system instruction is needed, Flash 1.5/2.0 supports system_instruction field, 
        // but prepending is robust).
        const finalPrompt = `[SYSTEM INSTRUCTION: ${this.systemPrompt}]\n\nUser: ${userMessage}`;

        contents.push({
            role: "user",
            parts: [{ text: finalPrompt }]
        });

        const url = `${API_URL}?key=${API_KEY}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        maxOutputTokens: 150,
                        temperature: 0.7
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("LLM API Error:", errorData);
                return `Minion: *Confused* (API Error: ${response.status})`;
            }

            const data = await response.json();
            // Gemini response path
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                return "Minion: *Stares blankly* (No response)";
            }

        } catch (error) {
            console.error("LLM Network Error:", error);
            return "Minion: *Silence* (Network error)";
        }
    }
}
