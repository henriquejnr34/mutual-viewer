
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { getSessionCookie } from '../lib/session.js';

type Tweet = {
    id: string;
    text: string;
    author_id?: string;
};

type UserFromApi = {
    id:string;
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
    id: string;
    name: string;
    username: string;
    profileImageUrl: string;
    score: number;
    tweets: string[];
}

// Helper to shuffle an array for random sampling
const shuffleArray = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

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
                    id: author.id,
                    name: author.name,
                    username: author.username,
                    profileImageUrl: author.profile_image_url,
                    score: weight,
                    tweets: [tweet.text],
                });
            }
        }
    }
};

async function getSapecaAnalysis(ai: GoogleGenAI, loggedInUser: string, targetUser: string, tweets: string[]): Promise<string> {
    const tweetContext = tweets.map(t => `- "${t.replace(/\n/g, ' ')}"`).join('\n');
    const prompt = `Você é um cupido digital com um senso de humor picante e divertido. O usuário @${loggedInUser} interagiu com @${targetUser}. Baseado nos seguintes tweets, que são uma mistura de curtidas e menções, escreva uma frase curta, engraçada e levemente atrevida (máximo 25 palavras) explicando por que a 'vibe' deles combina e por que 'com mutual é mais gostoso'. Mantenha o bom humor e use um emoji divertido (como 😉, 😏, ou 🔥). Importante: use a palavra em inglês 'mutual', não a traduza. Não use aspas na resposta. Tweets de contexto:\n${tweetContext}`;

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
    
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'A chave da API do Google (GEMINI_API_KEY) não está configurada no servidor.' });
    }

    const { accessToken, user: { id: userId, username: loggedInUsername } } = session;

    try {
        const userFields = 'user.fields=profile_image_url';
        const expansions = 'expansions=author_id';
        const maxLikes = 'max_results=2';
        const maxMentions = 'max_results=3';

        const likedTweetsUrl = `https://api.twitter.com/2/users/${userId}/liked_tweets?${maxLikes}&${expansions}&${userFields}`;
        const mentionsUrl = `https://api.twitter.com/2/users/${userId}/mentions?${maxMentions}&${expansions}&${userFields}`;

        const likedTweetsRes = await fetch(likedTweetsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!likedTweetsRes.ok) {
            const errorBody = await likedTweetsRes.json();
            console.error("X API Error (Liked Tweets):", errorBody);
            throw new Error(errorBody.detail || `X API request failed for liked tweets.`);
        }
        const likedTweetsData: TweetsApiResponse = await likedTweetsRes.json();
        
        const mentionsRes = await fetch(mentionsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!mentionsRes.ok) {
            const errorBody = await mentionsRes.json();
            console.error("X API Error (Mentions):", errorBody);
            throw new Error(errorBody.detail || `X API request failed for mentions.`);
        }
        const mentionsData: TweetsApiResponse = await mentionsRes.json();
        
        const interactionScores = new Map<string, InteractionInfo>();
        
        processInteractions(likedTweetsData, interactionScores, 1, userId);
        processInteractions(mentionsData, interactionScores, 2, userId);

        const topInteractions = Array.from(interactionScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        if (topInteractions.length === 0) {
            return res.status(200).json([]);
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const analyzedInteractionsPromises = topInteractions.map(async (interaction) => {
            const analysis = await getSapecaAnalysis(
                ai,
                loggedInUsername,
                interaction.username,
                shuffleArray(interaction.tweets).slice(0, 10)
            );
            const { score, tweets, ...rest } = interaction;
            return {
                ...rest,
                analysis,
            };
        });

        const analyzedInteractions = await Promise.all(analyzedInteractionsPromises);

        res.status(200).json(analyzedInteractions);

    } catch (error: any) {
        console.error('Failed to fetch interactions:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch data from X API.' });
    }
}
