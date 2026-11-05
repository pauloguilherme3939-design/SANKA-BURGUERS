# Configuração comercial aprovada para revisão — custos em validação

Base: master após o release visual do PR #2, commit `1618d404a9f137cd33ce8a285ea28925b104d2d6`. Este pacote comercial não autoriza merge ou publicação.

No contexto da continuação do Sprint 9, o proprietário aprovou a imagem do X-Smash, a receita e os preços para preparação/revisão. A última instrução mantém expressamente proibidos merge, publicação de preços e alterações no banco. Custos atuais e margens ainda não foram comprovados.

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

## Imagem aprovada e custos pendentes

As fotos dos combos, incluindo as latas Sanka aprovadas, e todas as demais fotos permanecem idênticas. Nenhuma imagem foi regenerada. A imagem aprovada é `smash-2x125-prensado.png`, aplicada como `assets/burgers/x-smash-2x125-prensado-v1.png`, com WebP derivado para carregamento e PNG original preservado. O arquivo anterior `x-smash-v3.webp` também foi preservado. A nova imagem mostra duas camadas de carne, queijo entre elas e por cima e pão baixo/tostado; não comprova peso ou tamanho físico. A receita informa 2 × 125 g crus. Não solicitar novamente esta aprovação nem modificar as fotos dos combos.

R$ 14,41 é cenário histórico parcial do Smash, com embalagem antiga, não custo completo atual. Faltam compras atualizadas, porções de queijo e maionese, rendimento/perdas, embalagem por canal, despesas variáveis, taxas e impostos. Sem essas entradas, a margem atual permanece desconhecida. Nenhum custo faltante foi preenchido com zero e nenhum lucro líquido foi anunciado. A ausência desses custos não impede a prévia, mas impede aprovação automática para venda.

## Escopo técnico e aprovação

O código de checkout, APIs, banco, migrations e regras de entrega não mudam. Retirada gratuita; delivery com área/frete e total final sujeitos à confirmação existente. Não considerar os ensaios de preço como nova homologação de Neon, pagamento, WhatsApp real ou integração de todos os pacotes anteriores do checkout.

Antes do merge comercial, concluir a validação financeira com custos atuais, conferir a integração pertinente e receber autorização específica de publicação. A imagem, receita e preços já aprovados não devem ser submetidos novamente à mesma decisão. A aprovação do proprietário não transforma os R$ 14,41 históricos em custo atual ou margem comprovada. A branch de revisão tem deploy automático bloqueado. Manter o PR em rascunho enquanto esta etapa proíbe publicação.

Rollback: a proposta não altera dados existentes ou schema. Antes de publicar, conferir o deployment visual READY e a base da master. Após eventual publicação autorizada, uma reversão do commit/merge volta o catálogo para os preços anteriores, sem reescrever preços registrados nos pedidos já criados; validar carrinhos abertos e pedidos em andamento. Não apagar pedidos ou executar rollback de banco para voltar preços.

## Somente conceito, fora do catálogo

- Sanka Dog Bacon: variação conceitual usando bacon já existente; montagem, porção e custo pendentes.
- Bauru Provolone Acebolado: proposta de variação do Bauru com provolone já existente; teste físico, quantidades e custo pendentes.
- Maionese Biquinho: hipótese com maionese caseira e pimenta biquinho já citadas; formulação, porção e custo pendentes.
- Dupla Livre da Sanka: conceito sem regras de combinação, preço ou desconto definidos.

Não cadastrados para venda, sem preços arbitrários. Chips, Arcade, Club, SQLite experimental e demais Labs ficam fora deste PR.
