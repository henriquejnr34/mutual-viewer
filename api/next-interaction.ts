
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

async function getSapecaAnalysis(ai: GoogleGenAI, loggedInUser: string, targetUser: string, tweet: string): Promise<string> {
    const prompt = `Você é um cupido digital com um senso de humor picante e divertido. O usuário @${loggedInUser} interagiu com @${targetUser}. Baseado no seguinte tweet, escreva uma frase curta, engraçada e levemente atrevida (máximo 25 palavras) explicando por que a 'vibe' deles combina e por que 'com mutual é mais gostoso'. Mantenha o bom humor e use um emoji divertido (como 😉, 😏, ou 🔥). Não use aspas na resposta. Tweet de contexto:\n- "${tweet.replace(/\n/g, ' ')}"`;

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

const findNextInteraction = async (
    accessToken: string,
    userId: string,
    seenUserIds: string[],
    endpoint: string
): Promise<{ user: UserFromApi; tweet: Tweet } | null> => {
    
    const userFields = 'user.fields=profile_image_url';
    const expansions = 'expansions=author_id';
    const maxResults = 'max_results=3'; // Fetch a small batch to find one new person

    const url = `https://api.twitter.com/2/users/${userId}/${endpoint}?${maxResults}&${expansions}&${userFields}`;
    
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    if (!response.ok) {
        const errorBody = await response.json();
        console.error(`X API Error (${endpoint}):`, errorBody);
        throw new Error(errorBody.detail || `X API request failed for ${endpoint}.`);
    }

    const data: TweetsApiResponse = await response.json();
    
    const users = data.includes?.users;
    const tweets = data.data;

    if (!users || !tweets || tweets.length === 0) {
        return null;
    }

    const usersMap = new Map(users.map(u => [u.id, u]));

    for (const tweet of tweets) {
        const authorId = tweet.author_id;
        if (authorId && authorId !== userId && !seenUserIds.includes(authorId)) {
            const author = usersMap.get(authorId);
            if (author) {
                return { user: author, tweet: tweet };
            }
        }
    }

    return null; // No new user found in this batch
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const session = getSessionCookie(req);
    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'A chave da API do Google (GEMINI_API_KEY) não está configurada no servidor.' });
    }
    
    const { seenUserIds } = req.body;
    if (!Array.isArray(seenUserIds)) {
        return res.status(400).json({ error: 'Missing or invalid seenUserIds in request body.' });
    }

    const { accessToken, user: { id: userId, username: loggedInUsername } } = session;

    try {
        // 1. Try to find in liked tweets
        let interaction = await findNextInteraction(accessToken, userId, seenUserIds, 'liked_tweets');
        
        // 2. If not found, try mentions
        if (!interaction) {
            interaction = await findNextInteraction(accessToken, userId, seenUserIds, 'mentions');
        }

        // 3. If still no interaction, we're done for now
        if (!interaction) {
            return res.status(200).json({ mutual: null, message: "No new interactions found." });
        }
        
        const { user, tweet } = interaction;
        
        // 4. We found someone, now get the AI analysis
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const analysis = await getSapecaAnalysis(ai, loggedInUsername, user.username, tweet.text);

        const mutual = {
            id: user.id,
            name: user.name,
            username: user.username,
            profileImageUrl: user.profile_image_url,
            analysis: analysis,
        };

        res.status(200).json({ mutual });

    } catch (error: any) {
        console.error('Failed to fetch next interaction:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch data from X API.' });
    }
}
