# Checklist SEO Local — Sanka Burgers

## Google Business Profile (GBP)

### Configuração inicial
- [ ] Criar ou reivindicar o perfil em business.google.com
- [ ] Verificar a empresa (carta/telefone/e-mail)
- [ ] Preencher nome exato: **Sanka Burgers**
- [ ] Categoria principal: **Hamburgueria** ou **Lanchonete**
- [ ] Categorias secundárias: Restaurante, Delivery de comida
- [ ] Endereço completo com CEP (atualizar em `lib/brand.js → address / zipCode`)
- [ ] Área de entrega: Rio Claro e bairros próximos
- [ ] Telefone/WhatsApp: (16) 99313-8450
- [ ] Site: URL do site Sanka Burgers
- [ ] Horário: Ter–Dom 18h–23h30, Segunda fechado

### Fotos (prioridade alta)
- [ ] Logo em alta resolução (mínimo 720×720)
- [ ] Foto de capa: burger mais visual do cardápio
- [ ] Fotos dos burgers (mínimo 10 fotos de pratos)
- [ ] Foto da fachada / ambiente
- [ ] Foto da equipe (gera humanização e confiança)

### Conteúdo
- [ ] Descrição (750 caracteres): incluir "lanche prensado", "Rio Claro", "estilo São Carlos", "hamburguer artesanal"
- [ ] Adicionar produtos/cardápio com preços e fotos
- [ ] Publicar pelo menos 1 "Atualização" por semana (promo, oferta, novo item)
- [ ] Responder TODAS as avaliações (positivas e negativas) em até 24h

### Avaliações
- [ ] Configurar `googleMapsUrl` em `lib/brand.js` após criar o perfil
- [ ] Ativar `isGoogleRatingActive: true` em brand.js quando atingir ≥ 10 avaliações reais com média ≥ 4.5
- [ ] Criar QR Code do link de avaliação e colocar no balcão/embalagens
- [ ] Pedir avaliação ao cliente via WhatsApp após entrega ("Tudo certo com o pedido? Se curtiu, deixa uma avaliação:")

---

## Site (já implementado)

- [x] FAQ com perguntas de cauda longa ("hamburgueria em Rio Claro", "lanche prensado Rio Claro")
- [x] Páginas de nicho: `melhor-hamburgueria-rio-claro.html`, `delivery-hamburgueria-rio-claro.html`, etc.
- [x] Seção de localização com horários
- [x] Schema `LocalBusiness` (verificar no `index.html`)
- [x] Meta description com cidade e categoria

---

## Distribuição de citações (NAP consistency)

Nome, Endereço e Telefone devem ser **idênticos** em todos os lugares:

- [ ] Google Business Profile
- [ ] iFood (quando ativar)
- [ ] Instagram bio
- [ ] Site (rodapé e página de localização)
- [ ] WhatsApp Business (nome do perfil)

---

## Prioridade de execução

1. Criar/verificar GBP → maior impacto imediato
2. Adicionar fotos de qualidade → CTR do mapa
3. Preencher `googleMapsUrl` no `brand.js` → ativa CTA "Avaliar no Google" no site
4. Conseguir 10+ avaliações reais → ativar `isGoogleRatingActive`
5. Publicar atualizações semanais no GBP
