
export interface User {
  id: string;
  name: string;
  username: string;
  profileImageUrl: string;
  analysis?: string; // Analysis is now optional as it will be fetched on demand
  tweets?: string[]; // Tweets context to be sent for analysis
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  profileImageUrl: string;
}