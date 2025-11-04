
import type { VercelRequest, VercelResponse } from '@vercel/node';
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


export default async function handler(req: VercelRequest, res: VercelResponse) {
    const session = getSessionCookie(req);
    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { accessToken, user: { id: userId } } = session;

    try {
        const userFields = 'user.fields=profile_image_url';
        const expansions = 'expansions=author_id';
        const maxResults = 'max_results=50';

        const likedTweetsUrl = `https://api.twitter.com/2/users/${userId}/liked_tweets?${maxResults}&${expansions}&${userFields}`;
        const mentionsUrl = `https://api.twitter.com/2/users/${userId}/mentions?${maxResults}&${expansions}&${userFields}`;

        // Fetch liked tweets sequentially to avoid rate limiting
        const likedTweetsRes = await fetch(likedTweetsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!likedTweetsRes.ok) {
            const errorBody = await likedTweetsRes.json();
            console.error("X API Error (Liked Tweets):", errorBody);
            throw new Error(errorBody.detail || `X API request failed for liked tweets.`);
        }
        const likedTweetsData: TweetsApiResponse = await likedTweetsRes.json();
        
        // Then, fetch mentions sequentially
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

        const sortedInteractions = Array.from(interactionScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 15)
            .map(({ score, tweets, ...rest }) => ({
                ...rest,
                // Shuffle and take a random sample of up to 10 tweets
                tweets: shuffleArray(tweets).slice(0, 10),
            }));

        res.status(200).json(sortedInteractions);

    } catch (error: any) {
        console.error('Failed to fetch interactions:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch data from X API.' });
    }
}
