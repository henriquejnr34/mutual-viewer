
import { User } from '../types';

export const getMutuals = async (): Promise<User[]> => {
  try {
    // This now calls our own backend API function, which is securely hosted on Vercel.
    const response = await fetch(`/api/getMutuals`); 
    
    if (!response.ok) {
      throw new Error('The backend API failed.');
    }
    
    const mutuals: User[] = await response.json();
    return mutuals;

  } catch (error) {
    console.error("Error fetching mutuals from Vercel backend:", error);
    throw error;
  }
};
