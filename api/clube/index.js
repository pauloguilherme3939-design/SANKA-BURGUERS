'use strict';

// O Clube permanece indisponível até possuir persistência privada,
// regras homologadas e base legal aprovada. Este endpoint não lê nem grava dados.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  return res.status(503).json({
    error: 'O Clube Sanka ainda não está disponível.',
    code: 'CLUB_DISABLED',
  });
};
