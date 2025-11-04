
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { getSessionCookie } from '../lib/session.js';

async function getSapecaAnalysis(ai: GoogleGenAI, loggedInUser: string, targetUser: string, tweets: string[]): Promise<string> {
    const tweetContext = tweets.slice(0, 10).map(t => `- "${t.replace(/\n/g, ' ')}"`).join('\n');
    const prompt = `Você é um cupido digital com um senso de humor picante e divertido. O usuário @${loggedInUser} interagiu com @${targetUser}. Baseado nos seguintes tweets, que são uma mistura de curtidas e menções, escreva uma frase curta, engraçada e levemente atrevida (máximo 25 palavras) explicando por que a 'vibe' deles combina e por que 'com mutual é mais gostoso'. Mantenha o bom humor e use um emoji divertido (como 😉, 😏, ou 🔥). Não use aspas na resposta. Tweets de contexto:\n${tweetContext}`;

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
    
    const { targetUsername, tweets } = req.body;
    if (!targetUsername || !Array.isArray(tweets)) {
        return res.status(400).json({ error: 'Missing targetUsername or tweets in request body.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const loggedInUsername = session.user.username;

        const analysis = await getSapecaAnalysis(ai, loggedInUsername, targetUsername, tweets);

        res.status(200).json({ analysis });

    } catch (error: any) {
        console.error('Failed to get analysis:', error);
        res.status(500).json({ error: error.message || 'Failed to generate analysis.' });
    }
}
