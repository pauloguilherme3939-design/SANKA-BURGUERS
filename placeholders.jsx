// Placeholder visuals — SVG-based mood food photography
// Radial gradients in SVG render without banding, regardless of canvas size.

const FOOD_MOODS = [
  // 0 — golden chapa
  { c1: "#ffd070", c2: "#f59a2a", c3: "#b85410", c4: "#3a1408", glow: "#ffeaa0", accent: "#ff9e4a" },
  // 1 — molten cheese
  { c1: "#ffd86a", c2: "#e89a30", c3: "#a2470a", c4: "#2a0e02", glow: "#fff0b0", accent: "#ffb84a" },
  // 2 — bacon ember
  { c1: "#ffa860", c2: "#d2541a", c3: "#7a200a", c4: "#1a0402", glow: "#ffc090", accent: "#ff8a3a" },
  // 3 — dark spice
  { c1: "#e8a05a", c2: "#a35420", c3: "#4a1a08", c4: "#140404", glow: "#ffc890", accent: "#d88a4a" },
  // 4 — caramel honey
  { c1: "#ffdc8a", c2: "#e8a040", c3: "#8a4a14", c4: "#241004", glow: "#fff2c8", accent: "#ffc070" },
  // 5 — deep saucy
  { c1: "#ff9a5a", c2: "#b03020", c3: "#4a0a08", c4: "#140204", glow: "#ffb890", accent: "#ff6a3a" },
];

function moodIndex(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % FOOD_MOODS.length;
}

// Build an SVG data URI for a given mood — smooth radial bloom with off-center
// accent glow, soft vignette, and just enough character to suggest a food
// composition shot (warm light from above, darker edges).
function moodSvg(m, seed) {
  const j = (n) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  const cx = 45 + Math.round(j(1) * 20);
  const cy = 50 + Math.round(j(2) * 20);
  const gx = 30 + Math.round(j(3) * 40);
  const gy = 22 + Math.round(j(4) * 22);
  const ax = 60 + Math.round(j(5) * 30);
  const ay = 60 + Math.round(j(6) * 25);
  const svg =
`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid slice'>
  <defs>
    <radialGradient id='g' cx='${cx}%' cy='${cy}%' r='75%'>
      <stop offset='0%' stop-color='${m.c1}'/>
      <stop offset='32%' stop-color='${m.c2}'/>
      <stop offset='72%' stop-color='${m.c3}'/>
      <stop offset='100%' stop-color='${m.c4}'/>
    </radialGradient>
    <radialGradient id='gl' cx='${gx}%' cy='${gy}%' r='40%'>
      <stop offset='0%' stop-color='${m.glow}' stop-opacity='0.75'/>
      <stop offset='100%' stop-color='${m.glow}' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='ac' cx='${ax}%' cy='${ay}%' r='32%'>
      <stop offset='0%' stop-color='${m.accent}' stop-opacity='0.55'/>
      <stop offset='100%' stop-color='${m.accent}' stop-opacity='0'/>
    </radialGradient>
    <radialGradient id='vg' cx='50%' cy='55%' r='75%'>
      <stop offset='55%' stop-color='#000' stop-opacity='0'/>
      <stop offset='100%' stop-color='#000' stop-opacity='0.55'/>
    </radialGradient>
  </defs>
  <rect width='100' height='100' fill='url(#g)'/>
  <rect width='100' height='100' fill='url(#gl)'/>
  <rect width='100' height='100' fill='url(#ac)'/>
  <rect width='100' height='100' fill='url(#vg)'/>
</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function FoodPlaceholder({ label, sub, mood, tags, prompt, seed }) {
  const idx = typeof mood === "number" ? mood % FOOD_MOODS.length : moodIndex((label || "") + (sub || ""));
  const m = FOOD_MOODS[idx];
  const moodSeed = ((label || "") + (sub || "") + idx).split("").reduce((a, c) => a + c.charCodeAt(0), 7);
  const url = moodSvg(m, moodSeed);

  const [loaded, setLoaded] = React.useState(false);
  const imgSeed = seed != null ? seed : moodSeed;
  // Use Loremflickr — fast Flickr CC image CDN. `tags` is a comma-list of tags;
  // for back-compat we also accept a `prompt` string and just pass it through.
  const tagPath = (tags || prompt || "").trim();
  const imgUrl = tagPath
    ? `https://loremflickr.com/640/512/${encodeURIComponent(tagPath)}?lock=${imgSeed}`
    : null;

  return (
    <div className="ph">
      <div
        className="ph-base"
        style={{
          backgroundImage: `url("${url}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {imgUrl && (
        <img
          className={`ph-img${loaded ? " loaded" : ""}`}
          src={imgUrl}
          alt={label || "Foto"}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
      <div className="ph-grain" />
      {(label || sub) && (
        <div className="ph-tag">
          <span className="ph-tag-dot" />
          <span>
            {label}
            {sub && <span className="ph-tag-sub"> · {sub}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

function FeatureIcon({ name }) {
  const stroke = "var(--amber)";
  const sw = 1.5;
  const common = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "leaf")
    return (<svg {...common}><path d="M5 19c0-9 6-14 14-14 0 9-5 14-14 14Z" /><path d="M5 19c4-4 8-6 14-14" /></svg>);
  if (name === "flame")
    return (<svg {...common}><path d="M12 3c2 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 1 2 3 1 3-1 0-2-1-3 0-4Z" /></svg>);
  if (name === "rocket")
    return (<svg {...common}><path d="M14 14 5 13l1-3 9 1Z" /><path d="m10 19 4-5" /><path d="M14 5c4 0 7 3 7 7l-9 1Z" /><circle cx="16" cy="9" r="1" /></svg>);
  if (name === "drop")
    return (<svg {...common}><path d="M12 3c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12Z" /></svg>);
  if (name === "spark")
    return (<svg {...common}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l4 4M14 14l4 4M6 18l4-4M14 10l4-4" /></svg>);
  if (name === "heart")
    return (<svg {...common}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10Z" /></svg>);
  return null;
}

Object.assign(window, { FoodPlaceholder, FeatureIcon });
