
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionCookie } from '../lib/session.js';
import { User } from '../types.js';
import { GoogleGenAI } from '@google/genai';

type Tweet = {
    id: string;
    text: string;
    author_id?: string;
};

type UserFromApi = {
    id: string;
    name: string;
    username: string;
    profile_image_url: string;
};

type TweetsApiResponse = {
    data?: Tweet[];
    includes?: {
        users?: UserFromApi[];
    };
    meta: {
        result_count: number;
        next_token?: string;
    };
    errors?: any[];
};

interface InteractionInfo {
    user: User;
    score: number;
    tweets: string[];
}

// Helper to process interactions and store relevant tweet text
const processInteractions = (
    data: TweetsApiResponse,
    scores: Map<string, InteractionInfo>,
    weight: number,
    currentUserId: string
) => {
    const users = data.includes?.users;
    const tweets = data.data;

    if (!users || !tweets) return;

    const usersMap = new Map(users.map(u => [u.id, u]));

    for (const tweet of tweets) {
        const authorId = tweet.author_id;
        if (!authorId || authorId === currentUserId) continue;

        const author = usersMap.get(authorId);
        if (author) {
            if (scores.has(authorId)) {
                const existing = scores.get(authorId)!;
                existing.score += weight;
                existing.tweets.push(tweet.text);
            } else {
                scores.set(authorId, {
                    user: {
                        id: author.id,
                        name: author.name,
                        username: author.username,
                        profileImageUrl: author.profile_image_url,
                        analysis: '', // Will be filled by AI
                    },
                    score: weight,
                    tweets: [tweet.text],
                });
            }
        }
    }
};

async function getSapecaAnalysis(ai: GoogleGenAI, loggedInUser: string, targetUser: string, tweets: string[]): Promise<string> {
    const tweetContext = tweets.slice(0, 5).map(t => `- "${t.replace(/\n/g, ' ')}"`).join('\n');
    const prompt = `Você é um cupido digital com um senso de humor picante e divertido. O usuário ${loggedInUser} interagiu com ${targetUser}. Baseado nos seguintes tweets, que são uma mistura de curtidas e menções, escreva uma frase curta, engraçada e levemente atrevida (máximo 25 palavras) explicando por que a 'vibe' deles combina e por que 'com mutual é mais gostoso'. Mantenha o bom humor e use um emoji divertido (como 😉, 😏, ou 🔥). Não use aspas na resposta. Tweets de contexto:\n${tweetContext}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (e) {
        console.error(`Gemini API error for ${targetUser}:`, e);
        return "Essa conexão é tão quente que até a IA ficou sem palavras. 🔥"; // Fallback response
    }
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
    const session = getSessionCookie(req);
    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
     if (!process.env.API_KEY) {
        return res.status(500).json({ error: 'A chave da API do Google não está configurada no servidor.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { accessToken, user: { id: userId, username: loggedInUsername } } = session;

    try {
        const userFields = 'user.fields=profile_image_url';
        const expansions = 'expansions=author_id';
        const maxResults = 'max_results=100';

        const likedTweetsUrl = `https://api.twitter.com/2/users/${userId}/liked_tweets?${maxResults}&${expansions}&${userFields}`;
        const mentionsUrl = `https://api.twitter.com/2/users/${userId}/mentions?${maxResults}&${expansions}&${userFields}`;

        const [likedTweetsRes, mentionsRes] = await Promise.all([
            fetch(likedTweetsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
            fetch(mentionsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } })
        ]);

        if (!likedTweetsRes.ok || !mentionsRes.ok) {
             const errorBody = !likedTweetsRes.ok ? await likedTweetsRes.json() : await mentionsRes.json();
             console.error("X API Error:", errorBody);
             throw new Error(errorBody.detail || `X API request failed.`);
        }

        const likedTweetsData: TweetsApiResponse = await likedTweetsRes.json();
        const mentionsData: TweetsApiResponse = await mentionsRes.json();
        
        const interactionScores = new Map<string, InteractionInfo>();
        
        processInteractions(likedTweetsData, interactionScores, 1, userId);
        processInteractions(mentionsData, interactionScores, 2, userId);

        const sortedInteractions = Array.from(interactionScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 15); // Limit to top 15 to avoid too many API calls

        // Generate AI analysis for each top interaction in parallel
        const usersWithAnalysis = await Promise.all(
            sortedInteractions.map(async (interaction) => {
                const analysis = await getSapecaAnalysis(ai, `@${loggedInUsername}`, `@${interaction.user.username}`, interaction.tweets);
                return {
                    ...interaction.user,
                    analysis: analysis,
                };
            })
        );
        
        res.status(200).json(usersWithAnalysis);

    } catch (error: any) {
        console.error('Failed to fetch interactions:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch data from X API.' });
    }
}