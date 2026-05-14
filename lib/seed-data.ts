export type SeedPost = {
  id: number;
  author: string;
  place: string;
  city: string;
  lines: [string, string, string];
  held: number;
  scene: string;
  themes: string[];
};

export type SeedPlace = {
  id: string;
  name: string;
  city: string;
  lng: number;
  lat: number;
  pids: number[];
};

export const SEED_POSTS: SeedPost[] = [
  { id: 1, author: 'natsume_k', place: 'Fushimi Inari Shrine', city: 'Kyoto, Japan', lines: ['first gate, still shut', 'a child counts the stone lanterns', 'the moss does not wait'], held: 12, scene: 'kyoto', themes: ['nature', 'silence', 'ancient', 'shrine', 'Japan', 'morning'] },
  { id: 2, author: 'marlowe_t', place: 'Odessa', city: 'East Village, New York', lines: ['late cab runs a red', 'fifth avenue at three a.m.', 'no witness but me'], held: 8, scene: 'nyc', themes: ['night', 'city', 'solitude', 'rain', 'bar'] },
  { id: 3, author: 'solène', place: 'Café de Flore', city: 'Saint-Germain, Paris', lines: ['your coat on my chair', 'still smells like sunday morning', "I haven't moved it"], held: 34, scene: 'paris', themes: ['memory', 'absence', 'love', 'morning', 'café', 'longing'] },
  { id: 4, author: 'ryo_h', place: '7-Eleven Shinjuku', city: 'Tokyo, Japan', lines: ['midnight store chime rings', 'a man buys rice balls and leaves', 'silence again falls'], held: 19, scene: 'tokyo', themes: ['night', 'city', 'solitude', 'Japan', 'silence', 'ritual'] },
  { id: 5, author: 'priya_m', place: "Powell's City of Books", city: 'Portland, OR', lines: ["grandmother's worn hands", 'folding sheets, not looking up', 'she hums something old'], held: 51, scene: 'quiet', themes: ['memory', 'family', 'age', 'quiet', 'love', 'books'] },
  { id: 6, author: 'otso_v', place: 'Paddington Station', city: 'London, UK', lines: ['rain streaks the window', 'everyone on this packed train', 'pretends to be fine'], held: 22, scene: 'london', themes: ['rain', 'city', 'solitude', 'commute', 'loneliness', 'station'] },
];

export const SEED_PLACES: SeedPlace[] = [
  { id: 'p1', name: 'Fushimi Inari Shrine', city: 'Kyoto, Japan', lng: 135.77, lat: 34.97, pids: [1] },
  { id: 'p2', name: 'Odessa', city: 'East Village, New York', lng: -73.99, lat: 40.73, pids: [2] },
  { id: 'p3', name: 'Café de Flore', city: 'Saint-Germain, Paris', lng: 2.33, lat: 48.85, pids: [3] },
  { id: 'p4', name: '7-Eleven Shinjuku', city: 'Tokyo, Japan', lng: 139.70, lat: 35.69, pids: [4] },
  { id: 'p5', name: "Powell's City of Books", city: 'Portland, OR', lng: -122.68, lat: 45.52, pids: [5] },
  { id: 'p6', name: 'Paddington Station', city: 'London, UK', lng: -0.18, lat: 51.52, pids: [6] },
];

export const PLACE_SUGGEST = [
  { n: 'Fushimi Inari Shrine', c: 'Kyoto, Japan' },
  { n: 'Kinkaku-ji', c: 'Kyoto, Japan' },
  { n: 'Senso-ji Temple', c: 'Tokyo, Japan' },
  { n: 'Shinjuku Gyoen', c: 'Tokyo, Japan' },
  { n: 'Odessa', c: 'East Village, New York' },
  { n: "Joe's Coffee", c: 'West Village, New York' },
  { n: 'Café de Flore', c: 'Saint-Germain, Paris' },
  { n: 'Shakespeare and Company', c: 'Paris, France' },
  { n: 'Paddington Station', c: 'London, UK' },
  { n: 'Tate Modern', c: 'London, UK' },
  { n: "Powell's City of Books", c: 'Portland, OR' },
  { n: 'Lan Su Chinese Garden', c: 'Portland, OR' },
  { n: 'Bondi Beach', c: 'Sydney, Australia' },
  { n: 'Grounds of Alexandria', c: 'Sydney, Australia' },
  { n: 'Nishiki Market', c: 'Kyoto, Japan' },
  { n: 'Tsukiji Outer Market', c: 'Tokyo, Japan' },
  { n: 'The High Line', c: 'New York, USA' },
  { n: 'Russ & Daughters', c: 'Lower East Side, New York' },
];

export const THREAD_TYPES = [
  'emotional resonance',
  'time of day',
  'the texture of silence',
  'figures seen from a distance',
  'the weight of memory',
  'threshold moments',
  'what is left unsaid',
  'light and its quality',
  'solitude in crowds',
  'the presence of absence',
];

export function getSvgScene(key: string): string {
  const scenes: Record<string, string> = {
    kyoto: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><defs><radialGradient id="sk" cx="50%" cy="30%" r="70%"><stop offset="0%" stop-color="#d4cfc0"/><stop offset="100%" stop-color="#a8a090"/></radialGradient><radialGradient id="ms" cx="50%" cy="60%" r="60%"><stop offset="0%" stop-color="#e8e4da" stop-opacity="0.7"/><stop offset="100%" stop-color="#e8e4da" stop-opacity="0"/></radialGradient></defs><rect width="900" height="600" fill="url(#sk)"/><rect y="320" width="900" height="280" fill="#6b7860" opacity="0.6"/><rect y="380" width="900" height="220" fill="#4a5440" opacity="0.8"/><ellipse cx="450" cy="480" rx="280" ry="60" fill="#8a9a88" opacity="0.5"/><ellipse cx="450" cy="480" rx="200" ry="40" fill="#a0b09e" opacity="0.4"/><rect x="415" y="340" width="70" height="8" fill="#7a7060" opacity="0.9"/><rect x="425" y="260" width="50" height="80" fill="#8a8070" opacity="0.9"/><polygon points="420,260 480,260 490,245 410,245" fill="#7a7060" opacity="0.9"/><rect x="430" y="230" width="40" height="15" fill="#6a6050" opacity="0.9"/><rect x="120" y="220" width="18" height="200" fill="#3a4030" opacity="0.8"/><ellipse cx="129" cy="200" rx="55" ry="80" fill="#4a5840" opacity="0.75"/><rect x="740" y="240" width="16" height="180" fill="#3a4030" opacity="0.8"/><ellipse cx="748" cy="220" rx="50" ry="75" fill="#4a5840" opacity="0.75"/><rect width="900" height="600" fill="url(#ms)"/></svg>`,
    nyc: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><defs><radialGradient id="gl" cx="30%" cy="80%" r="50%"><stop offset="0%" stop-color="#c8a060" stop-opacity="0.5"/><stop offset="100%" stop-color="#c8a060" stop-opacity="0"/></radialGradient></defs><rect width="900" height="600" fill="#1a1c24"/><rect x="0" y="80" width="120" height="520" fill="#22242e"/><rect x="100" y="140" width="90" height="460" fill="#1e2028"/><rect x="180" y="60" width="140" height="540" fill="#24262e"/><rect x="310" y="120" width="80" height="480" fill="#1c1e28"/><rect x="480" y="40" width="160" height="560" fill="#222430"/><rect x="630" y="100" width="110" height="500" fill="#1e2028"/><rect x="730" y="150" width="170" height="450" fill="#20222c"/><rect y="440" width="900" height="160" fill="#16181e"/><rect y="440" width="900" height="160" fill="url(#gl)"/></svg>`,
    paris: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c8c4d0"/><stop offset="100%" stop-color="#d8d4dc"/></linearGradient></defs><rect width="900" height="600" fill="url(#sk)"/><rect x="0" y="300" width="200" height="300" fill="#6a6870"/><polygon points="0,300 200,300 100,200" fill="#5a5860"/><rect x="180" y="320" width="180" height="280" fill="#727080"/><polygon points="180,320 360,320 270,210" fill="#626070"/><rect x="340" y="280" width="220" height="320" fill="#6a6870"/><polygon points="340,280 560,280 450,170" fill="#5a5860"/><rect x="540" y="310" width="160" height="290" fill="#727080"/><polygon points="540,310 700,310 620,200" fill="#626070"/><rect x="680" y="290" width="220" height="310" fill="#6a6870"/><polygon points="680,290 900,290 790,180" fill="#5a5860"/><polygon points="450,60 456,200 444,200" fill="#5a5868" opacity="0.4"/><rect x="449" y="200" width="2" height="80" fill="#5a5868" opacity="0.4"/></svg>`,
    tokyo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#0e1018"/><rect x="200" y="200" width="500" height="320" fill="#e8e4d8"/><rect x="200" y="200" width="500" height="40" fill="#d03030"/><rect x="220" y="260" width="460" height="8" fill="#c8c4b8" opacity="0.6"/><rect x="220" y="300" width="460" height="8" fill="#c8c4b8" opacity="0.6"/><rect x="220" y="340" width="460" height="8" fill="#c8c4b8" opacity="0.6"/><rect x="220" y="380" width="460" height="8" fill="#c8c4b8" opacity="0.6"/><rect y="520" width="900" height="80" fill="#12141c"/></svg>`,
    quiet: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><defs><radialGradient id="lt" cx="55%" cy="40%" r="55%"><stop offset="0%" stop-color="#f0e8d0"/><stop offset="100%" stop-color="#c8bca0"/></radialGradient></defs><rect width="900" height="600" fill="url(#lt)"/><rect x="0" y="300" width="900" height="300" fill="#d8cdb8" opacity="0.5"/><rect x="0" y="350" width="900" height="250" fill="#ccc0a8" opacity="0.4"/><line x1="0" y1="380" x2="900" y2="395" stroke="#b8ac96" stroke-width="1.5" opacity="0.4"/><ellipse cx="340" cy="340" rx="90" ry="30" fill="#c8a880" opacity="0.85" transform="rotate(-10,340,340)"/><ellipse cx="560" cy="350" rx="85" ry="28" fill="#c0a078" opacity="0.85" transform="rotate(8,560,350)"/></svg>`,
    london: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9098a8"/><stop offset="100%" stop-color="#b0b8c4"/></linearGradient></defs><rect width="900" height="600" fill="url(#sk)"/><line x1="80" y1="0" x2="60" y2="600" stroke="#9aa8b8" stroke-width="1.2" opacity="0.4"/><line x1="280" y1="0" x2="260" y2="600" stroke="#9aa8b8" stroke-width="1" opacity="0.35"/><line x1="480" y1="0" x2="462" y2="600" stroke="#9aa8b8" stroke-width="1.2" opacity="0.38"/><rect y="340" width="900" height="260" fill="#e0d8cc"/><rect x="0" y="390" width="160" height="80" rx="4" fill="#8a6060" opacity="0.8"/><rect x="180" y="390" width="160" height="80" rx="4" fill="#6a6090" opacity="0.8"/><rect x="360" y="390" width="160" height="80" rx="4" fill="#8a6060" opacity="0.8"/><ellipse cx="80" cy="388" rx="22" ry="26" fill="#2a2826" opacity="0.8"/><rect x="58" y="388" width="44" height="82" fill="#2a2826" opacity="0.8" rx="3"/></svg>`,
  };
  const svg = scenes[key] || scenes.kyoto;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}
