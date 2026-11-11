# P0.4 — candidata isolada; publicação bloqueada

Base bdbb5d2. Proteções recuperadas seletivamente de 7659547: idempotência persistente, coordenação entre abas, recuperação de tentativas, confirmação administrativa de delivery e validação de horários no servidor. Catálogo, imagens, preços, Chips, Instagram, CSS e Labs preservados.

## Contrato e transição

- Requer 001_neon_core, 002_order_archive_event_kind e 003_order_confirmation_idempotency, índices/constraints correspondentes e triggers imutáveis habilitados. Nenhuma migration remota foi executada.
- POST exige Idempotency-Key. O servidor calcula os valores; campos enviados pelo cliente não confirmam atendimento/frete.
- Delivery segue a política aprovada de registro pendente: endereço e bairro obrigatórios, cobertura/frete não presumidos; preparo bloqueado até administrador confirmar atendimento, frete, total e aceite do cliente. Negativa/incompletude não libera o pedido.
- Horários já aprovados estão ativos SOMENTE nesta candidata: seg/ter fechados; qua/qui/dom 18:30–23:30; sex/sáb 18:30–00:00, America/Sao_Paulo. Retry de intenção já persistida funciona após fechar.
- Runtime agora verifica ledger por SELECT; não cria schema. Comando antigo db:migrate falha conservadoramente. Scripts manuais 002/003 são arquivos para revisão, não autorização de execução.
- Coordenador usa Web Locks + estado compartilhado por revisão do carrinho. Sem coordenação segura, bloqueia envio. Novas compras independentes recebem outra revisão/chave; pendências antigas permanecem recuperáveis. Storage corrompido/indisponível não autoriza envio inseguro.
- WhatsApp configurado continua NÃO homologado. Nenhuma mensagem enviada; testes interceptam efeitos externos.
- Branch codex/p04-seguranca-isolada com deploymentEnabled=false: PR de revisão, sem publicação automática desta branch. Não mesclar antes dos gates abaixo.

## Gates para produção — ainda pendentes

1. Identificar o endpoint/branch/database/role efetivamente usados pelo deployment FAhp5ZS3YD9FKDYHpBTmVB2dJumQ. Nome main e variáveis alternativas não provam o destino de DATABASE_URL. Não abrir histórico bloqueado nem expor segredos. Falta acesso privado aos identificadores não sensíveis capturados pelo deployment ou evidência operacional existente que os correlacione inequivocamente; logs genéricos do código não registram esses identificadores.
2. Auditar esse alvo READ ONLY: ledger, tipos, colunas, índices únicos, CHECKs, triggers e permissões, além de agregados de conflitos. Se equivalente à main anteriormente auditada, faltam 002 e 003. Parar em qualquer divergência.
3. Autorizar e validar backup consistente e restauração em destino distinto, com retenção/custos conferidos. Confirmar contagens, integridade de payloads criptografados e disponibilidade protegida do segredo de descriptografia. Não copiar dados reais para laboratório sintético e não presumir que checkpoint da homologação protege produção. Definir RPO/RTO pelo ensaio.
4. Só com autorização específica, executar 002 → 003 manualmente no alvo comprovado. Cada DO é atômico; lock_timeout=3s e statement_timeout controlado. Guardar estado e hashes antes/depois. Parar se houver lock timeout, ledger divergente, índice inválido, trigger desabilitado ou alteração inesperada de dados.
5. Homologar esta árvore contra PostgreSQL 18 cliente/servidor em ambiente autorizado antes de produção. A validação local inclui PostgreSQL nativo 17 com conexões independentes e PostgreSQL 18 embutido (PGlite); não equivale a novo teste no Neon 18.
6. Homologar WhatsApp oficial e operação administrativa. Autorizações de migration e publicação são distintas. Publicar somente após revalidar carrinho/API, preços e política comercial, sem pedido real não autorizado.

## Recuperação

Falha dentro de um DO reverte apenas aquela migration. 002 permanece se 003 falhar posteriormente. Não executar rollback restritivo após archived/delivery_confirmed/associações idempotentes. Preservar histórico; preferir correção aditiva ou restauração ensaiada em outro destino, sem sobrescrever pedidos posteriores. Reverter código não resolve o schema e traz de volta os P0 antigos; suspender novos pedidos durante incidente até haver caminho validado.

## Reprodução local

- Resultado final: suíte 159 PASS, zero FAIL, dois opt-in ignorados (Neon externo e teste nativo, este executado separadamente); PostgreSQL nativo 17.11: cinco PASS; PostgreSQL 18 embutido: oito PASS; Chromium real desktop/mobile: 17 PASS, zero FAIL. Build aprovado.
- Conexões nativas independentes: 20 POSTs lógicos simultâneos, mesma chave, um ID e uma linha; retry recuperou o ID, conteúdo divergente retornou 409, compra independente gerou outro ID. Chromium também validou duas abas e 20 POSTs, com armazenamento local sintético.
- Limite: navegador usou memória/arquivos sintéticos; banco nativo foi exercitado pelo handler real, em camada separada. Não foi feita uma nova sessão navegador → Neon. Horários sintéticos usam relógios determinísticos; os testes dedicados exercitam a grade aprovada, limites e viradas.
- Suíte: node --test test/*.test.js test/*.test.mjs (Neon externo deve permanecer desativado).
- Build: node build.mjs.
- Teste nativo opt-in test/p04-native-postgres.test.js: cluster exclusivamente local em 127.0.0.1:55484, usuário sintético sanka_p04, banco NOVO vazio; P04_LOCAL_PSQL aponta para psql e P04_LOCAL_DATABASE para postgres ou sanka_p04_*. O ensaio recusa tabelas preexistentes e não apaga dados.
- Evidências completas e scripts de Chromium/PostgreSQL 18 ficam no workspace em outputs/p04-integracao-20261111, fora do site publicado. Nenhuma variável real deve ser carregada nesses ensaios.
