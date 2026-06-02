// app.jsx — Sanka Burgers
// Composição da home · v4 · Scroll reveal via IntersectionObserver

import {
  Nav, Hero, Destaques, ProvaArtesanal, HowItWorks,
  LaunchCoupon, ClubeCTA, NossaCarneTeaser, LocalBrand,
  OfertaDia, MonteBanner, Reviews, Location, FAQ, Footer, StickyWA
} from './sections.jsx'

const { useEffect } = React;

/* ──────────────────────────────────────────────────────────────
   Scroll Reveal
   Observa todos os elementos com [data-reveal] e adiciona a classe
   .is-visible quando entram no viewport — transições no CSS.
────────────────────────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -56px 0px',
      }
    );

    const targets = document.querySelectorAll('[data-reveal]');
    targets.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

/* ──────────────────────────────────────────────────────────────
   App
   Hierarquia:
   1. Hero forte
   2. Cardápio em destaque (Os mais pesados)
   3. Não é lanche pequeno. É Sanka.
   4. Como pedir
   5. Cupom de lançamento
   6. Clube Sanka
   7. Oferta relâmpago (quando ativa — 19h–22h)
   8. Nossa carne / Feito para Rio Claro sentir fome
   9. Depoimentos + Localização
   10. FAQ
   11. Rodapé
   12. Sticky WhatsApp mobile
────────────────────────────────────────────────────────────── */
function App() {
  useScrollReveal();

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Destaques />
        <ProvaArtesanal />
        <HowItWorks />
        <LaunchCoupon />
        <ClubeCTA />
        <OfertaDia />
        <NossaCarneTeaser />
        <LocalBrand />
        <Reviews />
        <Location />
        <FAQ />
      </main>
      <Footer />
      <StickyWA />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
