// Dados — Sanka Burgers

export const SANKA_CATS = [
  { id: "artesanais", label: "Burgers Artesanais" },
  { id: "alem", label: "Além dos Burgers" },
];

export const SANKA_BURGERS = [
  {
    name: "X-Americano",
    cat: "artesanais",
    code: "SK-L01",
    desc: "Pão de hambúrguer de 20 cm, hambúrguer artesanal de 300 g, queijo prato, presunto, ovo, alface, tomate e maionese caseira.",
    price: 37.9,
    tags: "burger,cheese,egg",
    src: "/assets/burgers/x-americano-v2.webp",
  },
  {
    name: "X-Acebolado",
    cat: "artesanais",
    code: "SK-L02",
    desc: "Pão de hambúrguer de 20 cm, hambúrguer artesanal de 300 g, queijo prato, cebola caramelizada, bacon e maionese caseira.",
    price: 40.9,
    tags: "burger,onion,bacon",
    src: "/assets/burgers/sb-005.webp",
  },
  {
    name: "X-Promel",
    cat: "artesanais",
    code: "SK-L03",
    desc: "Pão de hambúrguer, hambúrguer artesanal de 300 g, generosa camada de provolone, mel, rúcula e maionese caseira.",
    price: 44.9,
    tags: "burger,provolone,honey",
    src: "/assets/burgers/sb-004.webp",
  },
  {
    name: "X-Biquinho",
    cat: "artesanais",
    code: "SK-L04",
    desc: "Pão de hambúrguer de 20 cm, hambúrguer artesanal de 300 g, requeijão Skala, pimenta biquinho e maionese caseira.",
    price: 40.9,
    tags: "burger,pepper",
    src: "/assets/burgers/sb-007.webp",
  },
  {
    name: "X-Azeitonado",
    cat: "artesanais",
    code: "SK-L05",
    desc: "Pão de hambúrguer de 20 cm, hambúrguer artesanal de 300 g, queijo prato e azeitona verde regada em azeite extravirgem.",
    price: 37.9,
    tags: "burger,olive",
    src: "/assets/burgers/sb-013.webp",
  },
  {
    name: "X-Smash",
    cat: "artesanais",
    code: "SK-L06",
    desc: "Pão de hambúrguer de 20 cm, hambúrguer artesanal de 200 g, queijo prato e maionese caseira.",
    price: 26.9,
    tags: "burger,cheese",
    src: "/assets/burgers/x-smash-v2.webp",
  },
  {
    name: "X-Basic",
    cat: "artesanais",
    code: "SK-L07",
    desc: "Pão de hambúrguer de 20 cm, hambúrguer artesanal de 100 g, queijo prato, cebola, tomate e maionese caseira.",
    price: 18.9,
    tags: "burger,cheese",
    src: "/assets/burgers/x-basic-v2.webp",
  },
  {
    name: "X-Panceta",
    cat: "alem",
    code: "SK-L08",
    desc: "Pão de hambúrguer de 20 cm, hambúrguer artesanal de panceta de 300 g, queijo prato, rúcula, tomate e maionese caseira.",
    price: 32.9,
    tags: "burger,pancetta",
    src: "/assets/burgers/sb-015.webp",
  },
  {
    name: "X-Lombo",
    cat: "alem",
    code: "SK-L09",
    desc: "Pão de hambúrguer de 20 cm, 250 g de lombo suíno, queijo prato, cebola caramelizada, tomate e maionese caseira.",
    price: 32.9,
    tags: "sandwich,pork,onion",
    src: "/assets/burgers/x-lombo-v2.webp",
  },
  {
    name: "Sanka Dog",
    cat: "alem",
    code: "SK-L10",
    desc: "Pão de hot dog, 2 salsichas Perdigão, molho de tomate da casa, milho, purê de batata, batata palha, maionese caseira e ketchup.",
    price: 21.9,
    tags: "hotdog,sausage",
    src: "/assets/burgers/sb-002.webp",
  },
  {
    name: "Frango com Catupiri",
    cat: "alem",
    code: "SK-L11",
    desc: "Pão de hambúrguer de 20 cm, 250 g de frango em cubos, catupiri, tomate e maionese caseira.",
    price: 31.9,
    tags: "chicken,burger,cheese",
    src: "/assets/burgers/sb-011.webp",
  },
  {
    name: "Misto Quente",
    cat: "alem",
    code: "SK-L12",
    desc: "Pão baguete, queijo mussarela, presunto, tomate, orégano e maionese caseira.",
    price: 21.9,
    tags: "sandwich,ham,cheese",
    src: "/assets/burgers/misto-quente-v2.webp",
  },
  {
    name: "Prensadinho",
    cat: "alem",
    code: "SK-L13",
    desc: "Pão de hot dog, 1 salsicha Perdigão, molho da casa, batata palha e maionese caseira.",
    price: 14.0,
    tags: "hotdog,sausage",
    src: "/assets/burgers/prensadinho-v2.webp",
  },
  {
    name: "Bauru de Carne",
    cat: "alem",
    code: "SK-L14",
    desc: "Pão baguete, patinho acebolado, tomate, queijo prato e maionese caseira.",
    price: 34.9,
    tags: "sandwich,beef,onion",
    src: "/assets/burgers/bauru-carne-v2.webp",
  },
];

// Adicionais ainda não foram confirmados para o lançamento.
export const SANKA_EXTRAS = [];

export const SANKA_DRINKS = [
  {
    code: "SK-B01",
    name: "Refrigerante lata",
    desc: "Lata de 350 ml. Confirme os sabores disponíveis no pedido.",
    price: 8.0,
    tag: "350 ml",
    src: "/assets/drinks/refrigerante-lata.webp",
    bg: "linear-gradient(155deg, #2a2a2a 0%, #1a0a0a 100%)",
  },
  {
    code: "SK-B02",
    name: "Refrigerante 2L",
    desc: "Valor entre R$ 12,00 e R$ 18,00, conforme a opção. Consulte sabores e preço pelo WhatsApp.",
    price: 12.0,
    priceMax: 18.0,
    purchaseDisabled: true,
    tag: "2 litros",
    src: "/assets/drinks/refrigerante-2l-sanka.webp",
    bg: "linear-gradient(155deg, #c92a1f 0%, #4a0a0a 60%, #1a0202 100%)",
  },
];

export const SANKA_FEATURES = [
  { num: "01", title: "Ingredientes Selecionados", desc: "Hortifrúti diário, queijos da serra mineira, carne fresca moída na casa. Sem congelado, sem atalho.", icon: "leaf" },
  { num: "02", title: "Hambúrguer Artesanal", desc: "Blend exclusivo de acém, peito e fraldinha. Moído duas vezes, prensado leve, ponto suculento.", icon: "flame" },
  { num: "03", title: "Entrega Rápida", desc: "Saímos da chapa direto pra moto. Raio de 6km coberto em até 35 minutos ou o próximo é por nossa conta.", icon: "rocket" },
  { num: "04", title: "Molhos Exclusivos", desc: "Sete molhos da casa, desenvolvidos no balcão. Do barbecue defumado à maionese de ervas frescas.", icon: "drop" },
  { num: "05", title: "Sabor Marcante", desc: "Receita perfeita pela teimosia. Três anos testando até o cliente dizer que vicia. Não exageramos.", icon: "spark" },
  { num: "06", title: "Atendimento Premium", desc: "Pedido confirmado em segundos, status em tempo real, e atendente humano quando você precisa.", icon: "heart" },
];

export const SANKA_TESTIMONIALS = [
  { quote: "Melhor lanche prensado que comi em Rio Claro. O X Panceta chega pesado mesmo.", stars: 5, name: "Mariana S.", meta: "Cliente · Inauguração" },
  { quote: "Pedi uma vez e virei viciado. Tamanho de verdade, queijo derretendo em tudo.", stars: 5, name: "Diego R.", meta: "Cliente · Inauguração" },
  { quote: "X Provolone ao Mel é absurdo. Chega quente, prensado e bem recheado.", stars: 5, name: "Camila A.", meta: "Cliente · Inauguração" },
];

// ============================== COMBOS ==============================
// Combos ainda não foram confirmados para o lançamento.
export const SANKA_COMBOS = [];

// ============================== PORÇÕES ==============================
export const SANKA_SIDES = [
  {
    code: "SK-P01",
    name: "Fritas",
    size: "500 g",
    desc: "500 g de batatas fritas.",
    price: 30.0,
    tags: "fries,frenchfries",
    src: "/assets/sides/fritas-v2.webp",
  },
  {
    code: "SK-P02",
    name: "Fritas Sanka",
    size: "500 g",
    desc: "500 g de batatas fritas com bacon e catupiry.",
    price: 40.0,
    tags: "fries,cheese,bacon",
    src: "/assets/sides/fritas-sanka-v2.webp",
  },
  {
    code: "SK-P03",
    name: "Mandioca",
    size: "500 g",
    desc: "500 g de mandioca frita.",
    price: 45.0,
    tags: "cassava,fried",
    src: "/assets/sides/mandioca-v2.webp",
  },
  {
    code: "SK-P04",
    name: "Salgados Sortidos",
    size: "25 unidades",
    desc: "25 mini salgados fritos sortidos: coxinha, quibe e bolinha de queijo.",
    price: 35.0,
    tags: "snacks,fried",
    src: "/assets/sides/salgados-sortidos-v2.webp",
  },
];

// ============================== SOBREMESAS ==============================
export const SANKA_DESSERTS = [];
