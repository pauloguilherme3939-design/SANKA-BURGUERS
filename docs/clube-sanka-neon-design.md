# Clube Sanka — arquitetura segura planejada

Status: **desligado em Production**.

## Decisão de lançamento

O Clube não será ativado enquanto não existir confirmação confiável de titularidade do telefone. O código legado em `localStorage` não será fonte de verdade e permanece fora das rotas públicas.

## Arquitetura aprovada para a futura implementação

- `club_members`: identificador interno, telefone normalizado protegido por HMAC, dados cifrados, consentimento e datas de criação/revogação.
- `club_point_events`: ledger imutável com `earned`, `redeemed`, `adjustment`, `expired` e `reversed`.
- Cada evento referencia pedido e evento anterior quando houver reversão.
- Saldo é sempre calculado pelo servidor a partir do ledger; o navegador nunca envia saldo confiável.
- Cancelamento de pedido cria evento de reversão depois de o cancelamento persistir.
- Painel administrativo só adiciona ajustes por evento identificado; nunca reescreve o saldo.

## Portões para ativação

1. Definir autenticação/validação real do cliente e política de retenção.
2. Confirmar regras comerciais de pontos, validade e recompensas.
3. Implementar no Neon isolado de Preview, atualizar Privacidade e homologar abuso, cancelamento e recuperação.

Até esses três portões passarem, `isClubActive` permanece `false`.
