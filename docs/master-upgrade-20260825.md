# Master Upgrade de lançamento — decisões aplicadas

## Referências observadas

- In-N-Out: cardápio principal curto, produto legível e foco em qualidade.
- Five Guys: pedido direto sem obrigar cadastro e complementos apresentados no contexto do produto.
- Shake Shack: preço do canal direto comunicado sem atacar marketplaces; recompensas dependem de transação válida e são revertidas em cancelamentos.
- Cabana Burger: separação clara entre cardápio/pedido e clube.

Fontes oficiais:

- https://www.in-n-out.com/menu/
- https://www.fiveguys.com/online-ordering/
- https://www.fiveguys.com/mobile-app
- https://shakeshack.com/terms-conditions
- https://delivery.cabanaburger.com.br/

## Aplicado nesta rodada

- CTA principal conduz ao cardápio e ao fluxo persistido; WhatsApp permanece como ajuda e etapa final.
- Upsell discreto usa apenas Fritas e Refrigerante lata já existentes, com preços oficiais e sem desconto.
- Painel ganhou métricas reais, valor bruto explicitamente separado de lucro, tempo de espera, detalhes operacionais, WhatsApp manual e Modo Cozinha.
- Removidos textos e depoimentos fictícios que estavam dormentes no código.
- Tailwind de desenvolvimento foi removido de painel/rastreamento, imagens ganharam decodificação assíncrona e o hero evita animação pesada no celular.
- Foco visível, redução de movimento, skip links e cabeçalhos de segurança foram reforçados.

## Mantido desligado

- Clube Sanka: falta autenticação segura e regra comercial.
- Roleta Sanka: faltam aprovação econômica e legal.
- Avaliações, cupom, oferta e claims sem dados reais.
