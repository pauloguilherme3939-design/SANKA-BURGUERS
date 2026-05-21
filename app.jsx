// app.jsx — Sanka Burgers
// Composição da home · Scroll reveal via IntersectionObserver

import { Nav, Hero, Proof, FeaturedMenu, HowItWorks, Reviews, Location, Footer } from './sections.jsx'

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
────────────────────────────────────────────────────────────── */
function App() {
  useScrollReveal();

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Proof />
        <FeaturedMenu />
        <HowItWorks />
        <Reviews />
        <Location />
      </main>
      <Footer />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
