import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionCookie } from '../lib/session.js';
import { User } from '../types.js';

// Helper function to fetch paginated results from the X API
const fetchAllPages = async (url: string, accessToken: string) => {
    let results: any[] = [];
    let nextToken: string | undefined = undefined;

    do {
        const fetchUrl = nextToken ? `${url}&pagination_token=${nextToken}` : url;
        const response = await fetch(fetchUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("X API Error:", errorBody);
            throw new Error(`X API request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.data) {
            results = results.concat(data.data);
        }
        nextToken = data.meta?.next_token;
    } while (nextToken);
    
    return results;
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
    const session = getSessionCookie(req);
    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { accessToken, user: { id: userId } } = session;

    try {
        const userFields = 'user.fields=profile_image_url';
        
        // --- Fetching followers and following for the authenticated user ---
        // NOTE: In a production app with many followers/following, this can be slow and hit rate limits.
        // For this demo, we'll fetch a limited number. The X API allows up to 1000 per request.
        const followingUrl = `https://api.twitter.com/2/users/${userId}/following?max_results=1000&${userFields}`;
        const followersUrl = `https://api.twitter.com/2/users/${userId}/followers?max_results=1000&${userFields}`;

        // Fetching in parallel
        const [followingList, followersList] = await Promise.all([
            fetchAllPages(followingUrl, accessToken),
            fetchAllPages(followersUrl, accessToken)
        ]);
        
        const followingIds = new Set(followingList.map(u => u.id));
        
        const mutuals: User[] = followersList
            .filter(follower => followingIds.has(follower.id))
            .map(user => ({
                id: user.id,
                name: user.name,
                username: user.username,
                profileImageUrl: user.profile_image_url
            }));

        const shuffledMutuals = mutuals.sort(() => 0.5 - Math.random());

        res.status(200).json(shuffledMutuals);

    } catch (error: any) {
        console.error('Failed to fetch mutuals:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch data from X API.' });
    }
}
