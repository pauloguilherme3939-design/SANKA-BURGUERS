'use strict';

// Não existe painel de membros enquanto o Clube estiver desativado.
// Em especial, nenhuma credencial é aceita pela URL e nenhum dado é retornado.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  return res.status(503).json({
    error: 'O Clube Sanka ainda não está disponível.',
    code: 'CLUB_DISABLED',
  });
};
