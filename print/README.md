# print/ — material para a gráfica

⚠️ **NÃO IMPRIMIR até o domínio sankaburgers.com.br estar no ar.**

Hoje o `siteUrl` em `lib/brand.js` é provisório (`https://sankaburguers.vercel.app`),
então o `qr-panfleto.png` e o QR do `bilhete.html` apontam para esse endereço.

Quando o domínio estiver registrado e ligado na Vercel:
1. Trocar `siteUrl` em `lib/brand.js` para `https://sankaburgers.com.br`.
2. Rodar `npm run build` (regera o QR do panfleto e o bilhete, e confere a leitura).
3. Tirar o aviso do topo do `bilhete.html` e este aviso daqui.

Arquivos:
- `qr-panfleto.png` — QR em alta resolução para o panfleto (`?utm_source=panfleto`).
- `../bilhete.html` — bilhete da sacola, 4 por A4 (`?utm_source=sacola`).
