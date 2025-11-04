
export interface User {
  id: string;
  name: string;
  username: string;
  profileImageUrl: string;
  analysis: string; // Analysis is now required, fetched with the user
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  profileImageUrl: string;
}
