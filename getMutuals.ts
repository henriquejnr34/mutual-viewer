// NOVO ARQUIVO: api/getMutuals.ts
// (Este arquivo viveria no seu projeto, mas não podemos criá-lo aqui)

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // AQUI é onde a mágica acontece, de forma SEGURA.
  // As chaves secretas estariam guardadas na Vercel e acessadas aqui.
  const X_API_KEY = process.env.X_API_KEY;
  const X_API_SECRET = process.env.X_API_SECRET; // NUNCA exposto ao frontend!

  // Neste ponto, o servidor da Vercel (e não o navegador) faria a chamada segura
  // para a API real do X, usando as chaves acima.

  // Por enquanto, vamos simular a resposta que o X nos daria:
  const mockMutualsFromX = [
    { id: '101', name: 'Vercel User One', username: 'vercel_fan', profileImageUrl: '...' },
    { id: '102', name: 'Serverless Star', username: 'serverless_dev', profileImageUrl: '...' }
  ];

  // Enviamos a resposta de volta para o nosso frontend
  res.status(200).json(mockMutualsFromX);
}