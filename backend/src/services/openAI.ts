import axios from 'axios';

const OPENAI_API_URL = 'https://api.openai.com/v1/engines/davinci-codex/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const getMoodBasedRecommendation = async (userInput) => {
    try {
        const response = await axios.post(
            OPENAI_API_URL,
            {
                prompt: `Based on the following user input, suggest an anime: ${userInput}`,
                max_tokens: 50,
                n: 1,
                stop: null,
                temperature: 0.7,
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error('Error fetching recommendation from OpenAI:', error);
        throw new Error('Failed to fetch recommendation');
    }
};