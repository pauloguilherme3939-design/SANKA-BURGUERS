# Ação 3 — antiabuso e cancelamento

## Proteção atual

- O telefone é normalizado e validado como número brasileiro antes de persistir o pedido.
- As rotas de criação de pedido, giro/consumo da roleta e administração têm limites conservadores no servidor.
- Os limites combinam telefone, cookie técnico aleatório `HttpOnly` e grupo de rede (`/24` para IPv4 e `/64` para IPv6).
- Não existe fingerprint. O cookie pode ser apagado e, por isso, nunca é a única barreira.
- Telefone, rede e identificador técnico são transformados por HMAC antes da persistência.
- Os registros de controle ficam cifrados no mesmo Vercel Blob e têm limpeza oportunista após 48 horas.
- Falha no controle persistente bloqueia a operação protegida, sem gerar pedido ou prêmio falso.

## Limites iniciais

| Rota/política | Janela | Telefone | Dispositivo | Rede aproximada |
| --- | ---: | ---: | ---: | ---: |
| Criar pedido | 10 min | 6 | 10 | 100 |
| Girar roleta | 1 h | 3 | 5 | 60 |
| Consumir prêmio | 1 h | — | 15 | 100 |
| Falha de login admin | 15 min | — | 10 | 20 |
| Ação admin autenticada | 15 min | — | 200 | 300 |

Esses números são limites técnicos iniciais, não dados econômicos. Devem ser acompanhados para evitar bloqueio indevido de clientes em redes compartilhadas.

## Cancelamento

- Cancelamento é um evento cifrado e persistente; o pedido não é apagado.
- `cancelado` é terminal e não pode avançar para `entregue`.
- O rastreamento público recebe somente status e horários, sem motivo interno ou dados pessoais.
- O painel exige confirmação e só atualiza a tela depois da resposta de sucesso da API.
- Benefícios da roleta já associados ao pedido são invalidados; os cupons atuais não possuem saldo individual reutilizável.

## Confirmação real do telefone — etapa futura

Validação sintática e limites não comprovam titularidade. Se o abuso justificar o custo, a próxima camada deve ser um adaptador de verificação independente do pedido (WhatsApp/SMS), com código de uso único, expiração curta, contagem de tentativas e armazenamento apenas do HMAC do desafio. Nenhum provedor, preço ou integração foi assumido nesta ação.
