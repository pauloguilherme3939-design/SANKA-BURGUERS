# P0.6 — candidata consolidada, sem autorização de publicação

16/11/2026. Consolida sobre 81eff1a a correção de aplicação/teste do commit local 97e2d0d. O commit original e sua documentação permanecem preservados no checkout de origem; detalhes específicos do banco ficam no workspace privado, sem inclusão neste pacote.

## Correção

Delivery legado já em preparo não podia avançar sem confirmação, mas a confirmação era aceita somente em recebido. Serviço e painel agora permitem confirmar delivery ativo não arquivado em recebido/preparando/na_chapa/finalizando/saiu_entrega. Continuam obrigatórios autenticação administrativa, atendimento confirmado, frete em centavos, total calculado e aceite explícito do cliente. Não há aprovação automática, rebaixamento de estado ou reescrita do histórico. Terminais, arquivados e estados desconhecidos continuam bloqueados.

## Evidências e preservação

- 16/11: 67 testes direcionados PASS, zero FAIL/skip; build PASS. Inclui legado, delivery, checkout/idempotência, contextos isolados/respostas antigas, horários, API, persistência, ausência de DDL automático e proteção de deploy da branch.
- Comando: node --test test/legacy-delivery.test.js test/fulfillment.test.js test/ordering-hours.test.js test/checkout-idempotency.test.mjs test/checkout-contexts.test.mjs test/checkout-submit.test.mjs test/api-pedido.test.js test/postgres-store.test.js test/runtime-schema.test.js test/seo-integracao.test.mjs.
- Build: node build.mjs. Suíte completa não repetida.
- PostgreSQL/psql 18.6 cliente/servidor: homologação sintética anterior de 12/11, não nova execução neste sprint. Sete testes PASS; 20 INSERTs em conexões independentes → uma linha/um ID; retry/conflito/compra independente; permissões mínimas; confirmação e histórico. Cenário adicional do legado: dez confirmações concorrentes → um evento, payload cifrado/histórico anterior preservados, avanço somente após aceite válido.
- Os blobs Git de lib/orders.js, admin-pedidos-app.jsx e test/legacy-delivery.test.js são idênticos aos de 97e2d0d já testados em PostgreSQL 18. Migrations e demais proteções de persistência não foram alteradas.
- Validações Chromium do formulário em desktop/mobile e ensaios de restauração local são evidências anteriores. Não declarar que houve novo teste de navegador ou restauração remota neste sprint.
- Catálogo, preços, imagens, Chips, identidade, carrinho e coordenador preservados. Nenhuma migration/gravação remota ou mensagem real.

## Checklist para implantação futura

- [ ] Identificar por acesso privado autorizado o destino efetivo do deployment de produção, ou aprovar um destino deliberado com exportação completa e reconciliação do legado. Não inferir destino pelo nome main ou variável alternativa. Não acessar histórico protegido nem criar diagnóstico público.
- [ ] Inventariar dados preexistentes, colisões, estados e escritores; não presumir banco vazio. Corrigir divergências por plano próprio, preservando IDs/eventos e dados cifrados.
- [ ] Com autorização específica, criar backup consistente e restaurar em destino independente vazio; comparar schema, contagens/digests, vínculos, índices, constraints, funções e triggers. Validar chave de criptografia protegida sem registrar seu conteúdo ou dados pessoais. Backup local sintético não comprova recuperação de produção.
- [ ] Preservar o segredo de criptografia e seu vínculo com os hashes idempotentes; não rotacionar durante o release. Se origens tiverem segredos incompatíveis, interromper.
- [ ] Auditar contrato/ledger do alvo e obter autorização específica antes de executar somente migrations necessárias, na ordem 002 → 003. Não reaplicar cegamente 001 nem migrations já presentes. Conferir SQL/hashes revisados, janela, limites de lock/statement e privilégios. Runtime não inicializa schema automaticamente.
- [ ] Validar antes/depois: dados anteriores preservados, índices válidos, constraints validadas, ledger coerente e triggers imutáveis habilitados. Parar em divergência, timeout, chave indisponível ou conflito de legado.
- [ ] Homologar remotamente a árvore final somente em ambiente/dados autorizados, com integrações externas interceptadas. Confirmar canal oficial de atendimento e equipe administrativa; preservar confirmação manual de delivery e retirada gratuita.
- [ ] Obter autorizações distintas para cutover/configuração e merge/publicação. Manter este PR rascunho até os gates. A regra deploymentEnabled=false de codex/p04-seguranca-isolada permanece inalterada; nenhuma regra de master foi modificada.
- [ ] Na janela aprovada, congelar todos os escritores antigos, capturar estado final/deltas e reconciliar. Validar novo destino sem expor segredos; uma nova conexão não comprova a identidade do deployment antigo.
- [ ] Após publicação autorizada: conferir deployment/commit, catálogo, carrinho, chave/retry, horários, delivery/retirada e painel; testar falhas sem pedidos reais não autorizados. READY não substitui validação funcional.

## Recuperação

Falha dentro de um DO reverte aquela migration; 002 concluída não é desfeita por erro posterior na 003. Não executar rollback restritivo após eventos/associações da 003. Depois de novas escritas, não apontar de volta cegamente nem restaurar backup antigo sobre pedidos posteriores: congelar, preservar ambos, reconciliar deltas e preferir correção aditiva/recuperação isolada. Reversão apenas do código não resolve compatibilidade nem os P0 da versão antiga.

GO técnico isolado da candidata consolidada; publicação/abertura continuam condicionadas aos gates e autorizações. Nenhum merge ou deploy autorizado por este documento.
