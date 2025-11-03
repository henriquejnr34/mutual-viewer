
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // In a real application, this is where you would securely call the X API
  // using secrets stored as Environment Variables in Vercel.
  // const X_API_KEY = process.env.X_API_KEY;
  // const X_API_SECRET = process.env.X_API_SECRET;

  // For this demo, we're returning a mocked list of users.
  const mockMutualsFromX = [
    { id: '15436358', name: 'Guilherme Rambo', username: 'guilherme_rambo', profileImageUrl: 'https://i.pravatar.cc/512?u=15436358' },
    { id: '17882390', name: 'Taylor Otwell', username: 'taylorotwell', profileImageUrl: 'https://i.pravatar.cc/512?u=17882390' },
    { id: '2244994945', name: 'Vercel', username: 'vercel', profileImageUrl: 'https://i.pravatar.cc/512?u=2244994945' },
    { id: '759251', name: 'Linus Torvalds', username: 'linus__torvalds', profileImageUrl: 'https://i.pravatar.cc/512?u=759251' },
    { id: '44196397', name: 'Elon Musk', username: 'elonmusk', profileImageUrl: 'https://i.pravatar.cc/512?u=44196397' },
    { id: '12', name: 'Jack Dorsey', username: 'jack', profileImageUrl: 'https://i.pravatar.cc/512?u=12' },
  ];

  // We'll shuffle the array to make the slideshow different each time for a better demo experience.
  const shuffledMutuals = mockMutualsFromX.sort(() => 0.5 - Math.random());

  res.status(200).json(shuffledMutuals);
}
