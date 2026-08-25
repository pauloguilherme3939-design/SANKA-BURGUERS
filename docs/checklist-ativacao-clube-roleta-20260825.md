# Checklist seguro para Clube Sanka e Roleta

Estado verificado em 25/08/2026. Este documento não autoriza ativação pública.

## 1. Clube Sanka — fundação antes de abrir cadastros

- **Informado:** o Clube permanece desligado (`isClubActive: false`) e suas APIs retornam `503 CLUB_DISABLED` sem ler ou gravar clientes.
- **Pendente:** definir regras finais de pontos, validade, resgate, cancelamento e benefícios com custo real confirmado.
- **Pendente:** implementar persistência privada no Neon, vinculada somente a pedidos realmente persistidos, sem confiar em saldo ou identificação enviados pelo navegador.
- **Pendente:** aprovar termos, consentimento, política de privacidade, retenção e processo de exclusão/correção dos dados.

## 2. Roleta Sanka — infraestrutura e proteção de margem

- **Informado:** as flags públicas continuam desligadas e o ambiente publicado recusa ativação sem armazenamento homologado.
- **Pendente:** migrar a persistência da roleta para Neon; a implementação publicável não pode depender do Vercel Blob nem do armazenamento local antigo.
- **Pendente:** fechar custo real dos prêmios, decidir se as probabilidades continuam viáveis e obter aprovação jurídica antes de qualquer ativação.
- **Pendente:** manter antiabuso no servidor e decidir futuramente se a confirmação real do telefone será necessária.

## 3. Homologação e ativação controlada

- Testar Clube e Roleta juntos em Preview isolado, incluindo pedido, cancelamento, expiração, uso único, falha do banco, privacidade e adulteração do navegador.
- Ativar cada recurso por feature flag separada, com rollback simples e sem reutilizar dados reais de Production no Preview.
- Somente depois da aprovação técnica, econômica e jurídica alterar as flags de Production.
