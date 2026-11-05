# Proposta comercial — não aprovada para venda

Base: master após o release visual do PR #2, commit `1618d404a9f137cd33ce8a285ea28925b104d2d6`. Este pacote comercial não autoriza merge ou publicação.

| Produto | Antes | Candidato |
| --- | ---: | ---: |
| X-Clássico 250 g | R$ 18,90 | R$ 25,90 |
| Combo Clássico | R$ 26,90 | R$ 33,90 |
| X-Smash | R$ 26,90 | R$ 29,90 |
| Combo Duplo Smash | R$ 99,70 | R$ 105,70 |
| Combo Sanka Caprichado | R$ 126,70 | R$ 126,70, preservado |

Nenhum preço dos demais produtos é alterado. iFood mantém seu registro separado e não foi atualizado por este pacote.

## Receitas e combos

- Clássico: receita existente preservada — pão de 20 cm, hambúrguer artesanal de 250 g, queijo prato, cebola, tomate e maionese caseira.
- Smash candidato: pão original de 20 cm, duas carnes de 125 g crus cada, 250 g crus no total, ambas prensadas na chapa, queijo prato entre as carnes e por cima e maionese caseira. Substitui na proposta a descrição anterior de uma carne de 250 g; não acrescenta ingredientes.
- Combo Clássico: um Clássico e uma lata de 350 ml. Soma candidata: R$ 25,90 + R$ 8,00 = R$ 33,90.
- Duplo Smash: **dois lanches**, fritas de 500 g e duas latas de 350 ml. Quatro carnes de 125 g crus, 500 g crus ao todo nos lanches. Soma candidata: 2 × R$ 29,90 + R$ 29,90 + 2 × R$ 8,00 = R$ 105,70.
- Caprichado: composição preservada; Americano, Lombo, Fritas Sanka de 500 g e duas latas. R$ 37,90 + R$ 32,90 + R$ 39,90 + R$ 16,00 = R$ 126,70.

As somas são de preços de venda, não custos de produção. Nenhum desconto é presumido. `data.jsx` e `lib/order-catalog.json` são sincronizados; carrinho e resumo exibem esses dados, enquanto a API calcula os valores autoritativos por ID/quantidade. Preços enviados adulterados pelo navegador são ignorados nos testes.

## Imagens e custos — bloqueios comerciais

As fotos dos combos, incluindo as latas Sanka aprovadas, e todos os demais arquivos de imagem permanecem idênticos. Nenhuma imagem foi regenerada. A candidata sintética do Smash de duas carnes já existe na galeria de revisão e continua aguardando aprovação individual. O arquivo atual do Smash aparenta uma carne e não comprova a montagem candidata; não publicar a nova receita como produto definitivo sem resolver essa aprovação/coerência. A aprovação das latas não autoriza outras trocas de foto ou receita.

R$ 14,41 é cenário histórico parcial do Smash, com embalagem antiga, não custo completo atual. Faltam compras atualizadas, porções de queijo e maionese, rendimento/perdas, embalagem por canal, despesas variáveis, taxas e impostos. Sem essas entradas, a margem atual permanece desconhecida. Nenhum custo faltante foi preenchido com zero e nenhum lucro líquido foi anunciado. A ausência desses custos não impede a prévia, mas impede aprovação automática para venda.

## Escopo técnico e aprovação

O código de checkout, APIs, banco, migrations e regras de entrega não mudam. Retirada gratuita; delivery com área/frete e total final sujeitos à confirmação existente. Não considerar os ensaios de preço como nova homologação de Neon, pagamento, WhatsApp real ou integração de todos os pacotes anteriores do checkout.

Antes do merge comercial, exigir: aprovação de receita/gramagem; preços e custos/margens; imagens alteradas ou confirmação de coerência das preservadas; testes de integração completos; autorização específica de publicação. A branch de revisão tem deploy automático bloqueado. Manter o PR em rascunho até resolver as decisões comerciais.

Rollback: a proposta não altera dados existentes ou schema. Antes de publicar, conferir o deployment visual READY e a base da master. Após eventual publicação autorizada, uma reversão do commit/merge volta o catálogo para os preços anteriores, sem reescrever preços registrados nos pedidos já criados; validar carrinhos abertos e pedidos em andamento. Não apagar pedidos ou executar rollback de banco para voltar preços.

## Somente conceito, fora do catálogo

- Sanka Dog Bacon: variação conceitual usando bacon já existente; montagem, porção e custo pendentes.
- Bauru Provolone Acebolado: proposta de variação do Bauru com provolone já existente; teste físico, quantidades e custo pendentes.
- Maionese Biquinho: hipótese com maionese caseira e pimenta biquinho já citadas; formulação, porção e custo pendentes.
- Dupla Livre da Sanka: conceito sem regras de combinação, preço ou desconto definidos.

Não cadastrados para venda, sem preços arbitrários. Chips, Arcade, Club, SQLite experimental e demais Labs ficam fora deste PR.
