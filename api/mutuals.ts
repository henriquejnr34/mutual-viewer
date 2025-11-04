
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionCookie } from '../lib/session.js';
import { User } from '../types.js';

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


// Helper function to process API responses and update interaction scores
const processInteractions = (
    data: TweetsApiResponse,
    scores: Map<string, { user: User; score: number }>,
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
                scores.get(authorId)!.score += weight;
            } else {
                scores.set(authorId, {
                    user: {
                        id: author.id,
                        name: author.name,
                        username: author.username,
                        profileImageUrl: author.profile_image_url,
                    },
                    score: weight,
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
        const maxResults = 'max_results=100';

        const likedTweetsUrl = `https://api.twitter.com/2/users/${userId}/liked_tweets?${maxResults}&${expansions}&${userFields}`;
        const mentionsUrl = `https://api.twitter.com/2/users/${userId}/mentions?${maxResults}&${expansions}&${userFields}`;

        const [likedTweetsRes, mentionsRes] = await Promise.all([
            fetch(likedTweetsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
            fetch(mentionsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } })
        ]);

        if (!likedTweetsRes.ok || !mentionsRes.ok) {
            // Try to get a detailed error message from whichever one failed
             const errorBody = !likedTweetsRes.ok ? await likedTweetsRes.json() : await mentionsRes.json();
             console.error("X API Error:", errorBody);
             throw new Error(errorBody.detail || `X API request failed.`);
        }

        const likedTweetsData: TweetsApiResponse = await likedTweetsRes.json();
        const mentionsData: TweetsApiResponse = await mentionsRes.json();
        
        const interactionScores = new Map<string, { user: User; score: number }>();
        
        // Process liked tweets with a lower weight
        processInteractions(likedTweetsData, interactionScores, 1, userId);
        
        // Process mentions with a higher weight, as they are a more direct interaction
        processInteractions(mentionsData, interactionScores, 2, userId);

        const sortedInteractions = Array.from(interactionScores.values())
            .sort((a, b) => b.score - a.score)
            .map(item => item.user);

        res.status(200).json(sortedInteractions);

    } catch (error: any) {
        console.error('Failed to fetch interactions:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch data from X API.' });
    }
}