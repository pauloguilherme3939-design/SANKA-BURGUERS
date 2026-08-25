# Auditoria das imagens do cardápio — 24/08/2026

Escopo: cardápio público de lançamento. A classificação considera a correspondência visual com a composição registrada em `data.jsx`; não comprova que uma foto seja do produto final servido.

| Produto | Arquivo exibido após a correção | Status | Ação desta rodada |
| --- | --- | --- | --- |
| X-Americano | `assets/burgers/x-americano-v4.webp` | correta | Refeito no padrão amplo e prensado, sem marcas artificiais no pão e com a montagem informada: tomate abaixo da carne e alface acima do ovo. |
| X-Acebolado | `assets/burgers/sb-005.webp` | correta | Referência corrigida para o WebP que já existia. |
| X-Promel | `assets/burgers/sb-004.webp` | correta | Referência corrigida para o WebP que já existia. |
| X-Biquinho | `assets/burgers/sb-007.webp` | duvidosa | Mantida: o arquivo é o asset original destinado ao produto, mas a pimenta biquinho não fica inequívoca no enquadramento. |
| X-Azeitonado | `assets/burgers/sb-013.webp` | correta | Referência corrigida para o WebP que já existia. |
| X-Smash | `assets/burgers/x-smash-v3.webp` | correta | Refeito com pão liso, porção ampla e apresentação mais generosa. |
| X-Clássico | `assets/burgers/x-classico-v1.webp` | correta | O produto recebeu novo nome e imagem grande e prensada, preservando o ID interno. |
| X-Panceta | `assets/burgers/sb-015.webp` | duvidosa | Mantida: representa panceta e o padrão prensado, mas uma foto do produto real deve confirmar a aparência do hambúrguer artesanal de panceta. |
| X-Lombo | `assets/burgers/x-lombo-v5.webp` | correta | Refeito do zero no padrão prensado de São Carlos, com tomate na base, pão superior e inferior proporcionais e 250 g de lombo em cubos distribuídos numa única camada. |
| Sanka Dog | `assets/burgers/sb-002.webp` | correta | Referência corrigida para o WebP destinado ao hot dog. |
| X-Frango com Catupiry | `assets/burgers/sb-011.webp` | correta | Nome de apresentação corrigido, preservando o ID interno e a imagem destinada ao produto. |
| Misto Quente | `assets/burgers/misto-quente-v2.webp` | correta | Removida a foto de calabresa; criada versão de baguete com presunto, queijo, tomate, orégano e maionese. |
| Prensadinho | `assets/burgers/prensadinho-v2.webp` | correta | Removida a foto de frango; criada versão simples, prensada e com uma salsicha. |
| Bauru de Carne | `assets/burgers/bauru-carne-v3.webp` | correta | Refeito maior e mais farto, mantendo baguete e carne acebolada em tiras. |
| Fritas | `assets/sides/fritas-v2.webp` | correta | Removida a apresentação com molho não informado; criada porção simples. |
| Fritas Sanka | `assets/sides/fritas-sanka-v2.webp` | correta | Removida a imagem com molho amarelo; criada versão com bacon e creme branco de catupiry. |
| Mandioca | `assets/sides/mandioca-v3.webp` | correta | Imagem atualizada com o parmesão e o cheiro-verde informados. |
| Salgados Sortidos | `assets/sides/salgados-sortidos-v2.webp` | correta | Substituído o placeholder por coxinhas, quibes e bolinhas de queijo. |
| Refrigerante lata | `assets/drinks/refrigerante-lata.webp` | correta | Mantida a arte promocional personalizada da Sanka Burgers, conforme confirmação de Paulo. Ela representa as marcas disponíveis e não uma marca própria de refrigerante. |
| Refrigerante 2L | `assets/drinks/refrigerante-2l-sanka.webp` | correta | Criada arte promocional de garrafas de 2 litros no mesmo padrão personalizado da Sanka. A compra direta continua desativada até o cliente confirmar sabor e valor. |

## Item fora do cardápio atual

| Produto | Arquivo auditado | Status | Decisão |
| --- | --- | --- | --- |
| Lanche de brócolis | `assets/burgers/sb-014.webp` | precisa de nova imagem | A foto é exagerada e foi retirada da associação incorreta com o Bauru. O produto não está ativo no cardápio atual, portanto nenhuma composição nova foi inventada. |

## Origem das novas imagens

As novas imagens foram geradas com a ferramenta integrada de imagem, seguindo somente as composições registradas no catálogo e as correções informadas. Para X-Americano, X-Smash, X-Clássico e X-Lombo, `assets/burgers/sb-005.webp` foi usado apenas como referência do padrão visual grande e prensado da Sanka/São Carlos.
