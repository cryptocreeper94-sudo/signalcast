import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TOPICS = [
  'Lume language determinism',
  'DAIGS master taxonomy and agent intent mapping',
  'TrustLayer ecosystem safety framework',
  'Lume-V automated governance layer and 7 safety invariants',
  'Bridging determinism and LLM intelligence safely'
];

/**
 * Dynamically generates a highly engaging, thought-leadership style tweet
 * regarding the Lume ecosystem.
 */
export async function generateLumeTweet(): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Cannot generate dynamic Lume tweet.');
  }

  // Pick a random topic to keep rotation fresh
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

  const prompt = `
You are the lead architect and thought leader for TrustLayer and the Lume programming language.
Write a single, highly engaging, thought-provoking tweet (under 280 characters) about this specific topic: ${topic}

Guidelines:
- Make it sound visionary but deeply technical.
- Do not use exclamation marks or excessive emojis. Keep it clean and professional.
- Mention real concepts: 'determinism', 'runtime governance', 'agentic safety'.
- Do not use hashtags unless highly relevant (like #AI, #Web3). Limit to 1 hashtag.
- It should spark curiosity and make engineers want to learn more.
- Return ONLY the text of the tweet, nothing else. No quotes.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 100,
    });

    const tweet = response.choices[0]?.message?.content?.trim();
    if (!tweet) throw new Error('Empty response from OpenAI');

    return tweet;
  } catch (error) {
    console.error('[AI Generator] Failed to generate dynamic Lume tweet:', error);
    throw error;
  }
}
