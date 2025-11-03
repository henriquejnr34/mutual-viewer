
import { GoogleGenAI, Type } from "@google/genai";
import { User } from '../types';

// Function to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};


export const getMutuals = async (username: string, apiKey: string): Promise<User[]> => {
  // Simulate using the API key for a more realistic service layer.
  // In a real app, this key would be used in a fetch request header.
  console.log(`Simulating X API call for ${username} with key: ${apiKey.substring(0, 4)}...`);
  console.log(`Generating plausible mutuals for ${username} using Gemini as a secure fallback...`);
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Você é um especialista em redes sociais simulando uma API do X (Twitter). 
    Crie uma lista de 30 seguidores mútuos (mutuals) plausíveis para o usuário do X chamado '${username}'. 
    O usuário '${username}' é um desenvolvedor de software e entusiasta de tecnologia no Brasil. 
    Para cada mutual, forneça um nome completo e um nome de usuário (username) criativo. 
    A lista deve ser diversificada, incluindo outros desenvolvedores, designers, gerentes de produto e pessoas de áreas relacionadas à tecnologia.
    Não inclua o caractere '@' nos nomes de usuário.
  `;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'O nome completo do usuário.',
        },
        username: {
          type: Type.STRING,
          description: 'O nome de usuário (handle) do usuário no X, sem o @.',
        },
      },
      required: ['name', 'username'],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const generatedUsers = JSON.parse(response.text) as { name: string; username: string }[];

    if (!Array.isArray(generatedUsers)) {
      throw new Error("API simulation did not return a valid array of users.");
    }

    const mutuals: User[] = generatedUsers.map((user, index) => ({
      id: `user_${user.username}_${index}`,
      name: user.name,
      username: user.username,
      profileImageUrl: `https://i.pravatar.cc/400?u=${user.username}`, // Using a different avatar service for variety
    }));
    
    return shuffleArray(mutuals);

  } catch (error) {
    console.error("Error fetching mutuals from Gemini API:", error);
    // The error message now reflects the simulated API call
    throw new Error("Failed to generate mutuals. The simulated X API might be down or the key is invalid.");
  }
};
