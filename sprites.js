// Pixel art for Parth Mart.
// Every sprite is a list of text rows: one character = one pixel.
// "." is transparent; every other letter is a colour from PALETTE.
// To change the art, edit the rows. All rows in one sprite must be the same length.

export const PALETTE = {
  k: '#2B2118', // ink outline
  h: '#3D2B1F', // hair
  H: '#5A4130', // hair highlight
  s: '#C68A5E', // skin
  z: '#A56F47', // skin shade
  t: '#2E4A7D', // shopper's top
  T: '#24395F', // shopper's top, shade
  p: '#7A5F4A', // trousers
  b: '#8B5E3C', // wood
  B: '#6B4529', // wood shade
  m: '#E8B23A', // mustard
  M: '#C7952A', // mustard shade
  y: '#FFFDF7', // paper
  g: '#E3D5BA', // paper shade
  c: 'currentColor', // takes the CSS colour, e.g. the aisle colour on a pack
};

// Helpers -------------------------------------------------------------

// Build a symmetric sprite from its left half.
const mirror = (half) => half.map((row) => row + [...row].reverse().join(''));

// Lay `top` over `base`. "." keeps the base pixel, "_" erases it.
const overlay = (base, top) =>
  base.map((row, y) =>
    [...row]
      .map((ch, x) => {
        const t = top[y]?.[x];
        if (!t || t === '.') return ch;
        return t === '_' ? '.' : t;
      })
      .join('')
  );

// Swap rows starting at `start`.
const replaceRows = (base, start, rows) =>
  base.map((row, i) => (i >= start && i < start + rows.length ? rows[i - start] : row));

// Render rows to an SVG string. Runs of the same colour become one rect.
export function pixelSVG(rows, { palette = PALETTE, scale = 1, className = '' } = {}) {
  const h = rows.length;
  const w = rows[0].length;
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') { x += 1; continue; }
      let run = 1;
      while (x + run < w && row[x + run] === ch) run += 1;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${palette[ch] ?? 'currentColor'}"/>`;
      x += run;
    }
  });
  const size = scale ? ` width="${w * scale}" height="${h * scale}"` : '';
  return `<svg class="${className}" viewBox="0 0 ${w} ${h}"${size} shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}

// One-colour version for interface icons: every non-transparent pixel uses currentColor.
export const iconSVG = (rows, opts = {}) =>
  pixelSVG(rows, { ...opts, palette: new Proxy({}, { get: () => 'currentColor' }) });

// The shopper (20 x 20) -----------------------------------------------
// Built from a 16-pixel-wide figure with 2 spare columns on each side for the basket.

const pad = (rows) => rows.map((r) => `..${r}..`);

const shopperHead = mirror([
  '........',
  '.....kkk',
  '....khhh',
  '...khhhh',
  '..khhhhh',
  '..khhsss',
  '..ksssss',
  '..ksskss',
  '..ksssss',
  '..kzsssz',
  '...kssss',
  '....kkks',
]);

const shopperBackHead = mirror([
  '........',
  '.....kkk',
  '....khhh',
  '...khHhh',
  '..khhhhh',
  '..khhhhh',
  '..khhhhh',
  '..khhhhh',
  '..khhhhh',
  '..kshhhh',
  '...khhhh',
  '....kkks',
]);

const shopperBody = mirror([
  '....kttt',
  '...ktttt',
  '..kttktt',
  '..kTtktt',
  '..kssktt',
  '...kkppp',
]);

const legsStand = ['....kppkkppk....', '...kkkk..kkkk...'];
const legsStepA = ['....kppkkkkk....', '...kkkk.........'];
const legsStepB = ['....kkkkkppk....', '.........kkkk...'];

const basketRight = [
  ...Array(14).fill('....................'),
  '................kkk.',
  '...............k...k',
  '...............kkkkk',
  '...............kmbBk',
  '...............kbbBk',
  '...............kkkkk',
];
const basketLeft = basketRight.map((r) => [...r].reverse().join(''));

const front = (legs) => overlay(pad([...shopperHead, ...shopperBody, ...legs]), basketRight);
const back = (legs) => overlay(pad([...shopperBackHead, ...shopperBody, ...legs]), basketLeft);

const sideCore = [
  '................',
  '.....kkkkk......',
  '....khhhhhk.....',
  '...khHhhhhhk....',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhhsssk...',
  '...khhhhssksk...',
  '...khhhssssssk..',
  '...kkhhsssssk...',
  '....khhzsssk....',
  '.....kkkkskk....',
  '......kttttk....',
  '.....kttttttk...',
  '.....kttkTtk....',
  '.....kttkTtk....',
  '.....kttksssk...',
  '.....kkppppk....',
];
const sideLegs = {
  stand: ['......kppk......', '......kkkkk.....'],
  a: ['.....kpk.kpk....', '....kkk..kkkk...'],
  b: ['......kppk......', '.......kkkk.....'],
};
const sideBasket = [
  ...Array(15).fill('....................'),
  '..............kkk...',
  '.............k...k..',
  '.............kkkkk..',
  '.............kmbBk..',
  '.............kkkkk..',
];
const side = (legs) => overlay(pad([...sideCore, ...legs]), sideBasket);

export const SHOPPER = {
  down: [front(legsStand), front(legsStepA), front(legsStepB)],
  up: [back(legsStand), back(legsStepA), back(legsStepB)],
  side: [side(sideLegs.stand), side(sideLegs.a), side(sideLegs.b)],
};

// The cashier: Parth behind the counter (16 x 17) -------------------------

const cashierBase = mirror([
  '........',
  '.....kkk',
  '....khhh',
  '...khhhh',
  '..khhhhh',
  '..khhsss',
  '..ksssss',
  '..ksskss',
  '..ksssss',
  '..kssssz',
  '...kssss',
  '....kkks',
  '...kmmbb',
  '..kmmmbb',
  '..kmmkbb',
  '..kMmkbB',
  '..ksskbb',
]);

const badge = [
  ...Array(13).fill('................'),
  '......yy........',
  '......yy........',
];

const waveArm = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.kk.............',
  'kssk............',
  'kssk............',
  '.kmk............',
  '.kmk............',
  '.kmmk...........',
  '..kmmk..........',
  '..kmmm..........',
  '..___...........',
  '..___...........',
  '..___...........',
];

export const CASHIER = {
  idle: overlay(cashierBase, badge),
  wave: overlay(overlay(cashierBase, badge), waveArm),
};

// Cash register (20 x 15) -------------------------------------------------

export const REGISTER = [
  '...kkkkkkkkkk.......',
  '...kmmmmmmmmk.......',
  '...kmkkmkkmmk.......',
  '...kmmmmmmmmk.......',
  '...kkkkkkkkkk.......',
  '.......kk...........',
  '.kkkkkkkkkkkkkkkkk..',
  '.kbbbbbbbbbbbbbbbk..',
  '.kbykykykbbbyyyybk..',
  '.kbbbbbbbbbbbbbbbk..',
  '.kbykykykbbbbbbbbk..',
  '.kbbbbbbbbbbbbbbbk..',
  'kkkkkkkkkkkkkkkkkkk.',
  'kBBBBBBBkmmkBBBBBBk.',
  'kkkkkkkkkkkkkkkkkkk.',
];

// Product and aisle icons (12 x 12) ------------------------------------
// "c" pixels take the aisle colour; the rest come from the palette.

export const ICONS = {
  satellite: [
    '............',
    '.....kk.....',
    '.....kk.....',
    '....kkkk....',
    'kkk.kmmk.kkk',
    'kck.kmmk.kck',
    'kckkkmmkkkck',
    'kck.kMMk.kck',
    'kkk.kkkk.kkk',
    '.....kk.....',
    '....k..k....',
    '............',
  ],
  orbit: [
    '............',
    '.kkkk.......',
    'kcyyck......',
    'kcycck......',
    'kcccck......',
    '.kkkk.......',
    '.......m....',
    '......mmm...',
    '.......m....',
    '..........k.',
    '.........kyk',
    '..........k.',
  ],
  checklist: [
    '....kkkk....',
    '.kkkmmmmkkk.',
    '.kyyykkyyyk.',
    '.kycyyyyyyk.',
    '.kccykkkkyk.',
    '.kycyyyyyyk.',
    '.kyyyyyyyyk.',
    '.kycyyyyyyk.',
    '.kccykkkkyk.',
    '.kycyyyyyyk.',
    '.kyyyyyyyyk.',
    '.kkkkkkkkkk.',
  ],
  printer: [
    'kkkkkkkkkkkk',
    'kbbbbbbbbbbk',
    'kbkkkkkkkkbk',
    'kbk.kkkk.kbk',
    'kbkkkmmkkkbk',
    'kbk.kmmk.kbk',
    'kbk..kk..kbk',
    'kbk......kbk',
    'kbk.kcck.kbk',
    'kbk.kcck.kbk',
    'kkkkkkkkkkkk',
    'kk........kk',
  ],
  car: [
    '............',
    '............',
    '............',
    '.....kkkk...',
    '....kyyyyk..',
    '.kkkkkkkkkk.',
    'kcccccccccck',
    'kcccccccccck',
    'kkkkkkkkkkkk',
    '.kkk....kkk.',
    '.kyk....kyk.',
    '.kkk....kkk.',
  ],
  seed: [
    '..m.........',
    '.mym........',
    '..m...kkk...',
    '.....kccck..',
    '.kkk.kcck...',
    'kccck.kk....',
    '.kcckkk.....',
    '..kk.k......',
    '.kkkkkkkk...',
    '.kbbbbbbk...',
    '..kbbbbk....',
    '..kkkkkk....',
  ],
  thruster: [
    '............',
    '............',
    'kkkkkkk.....',
    'kckckckk.m..',
    'kckckckmkmm.',
    'kckckckmmyym',
    'kckckckmmyym',
    'kckckckmkmm.',
    'kckckckk.m..',
    'kkkkkkk.....',
    '............',
    '............',
  ],
  rocket: [
    '.....kk.....',
    '....kyyk....',
    '...kyyyyk...',
    '...kykkyk...',
    '...kykkyk...',
    '...kyyyyk...',
    '..kkyyyykk..',
    '.kykyyyykyk.',
    '.kkkyyyykkk.',
    '....kkkk....',
    '....kmmk....',
    '.....mm.....',
  ],
  terminal: [
    'kkkkkkkkkkkk',
    'kyyyyyyyyyyk',
    'kkkkkkkkkkkk',
    'kkkkkkkkkkkk',
    'kykkkkkkkkkk',
    'kkykkkkkkkkk',
    'kkkykkkkkkkk',
    'kkykkkkkkkkk',
    'kykkkyyyykkk',
    'kkkkkkkkkkkk',
    'kkkkkkkkkkkk',
    '............',
  ],
  wrench: [
    '.......kkk..',
    '......kyyk..',
    '......kyk..k',
    '......kykkyk',
    '.....kyyyyyk',
    '....kyyykkk.',
    '...kyyyk....',
    '..kyyyk.....',
    '.kyyyk......',
    'kyyyk.......',
    'kyyk........',
    '.kk.........',
  ],
  flask: [
    '....kkkk....',
    '....kyyk....',
    '....kyyk....',
    '....kyyk....',
    '...kyyyyk...',
    '..kyyyyyyk..',
    '..kyyyyyyk..',
    '.kmmmmmmmmk.',
    '.kmmmymmmmk.',
    'kmmmmmmmmmmk',
    'kkkkkkkkkkkk',
    '............',
  ],
  star: [
    '.....kk.....',
    '.....km.....',
    '....kmmk....',
    'kkkkkmmkkkkk',
    'kmmmmmmmmmmk',
    '.kmmmmmmmmk.',
    '..kmmmmmmk..',
    '..kmmmmmmk..',
    '.kmmmkkmmmk.',
    '.kmmk..kmmk.',
    'kmkk....kkmk',
    'kk........kk',
  ],
  rosette: [
    '...kkkkkk...',
    '..kmmmmmmk..',
    '.kmmMMMMmmk.',
    '.kmMmmmmMmk.',
    '.kmMmmmmMmk.',
    '.kmmMMMMmmk.',
    '..kmmmmmmk..',
    '...kkkkkk...',
    '...kbk.kbk..',
    '..kbbk.kbbk.',
    '..kbk...kbk.',
    '..kk.....kk.',
  ],
  scroll: [
    '..kkkkkkkk..',
    '.kyyyyyyyyk.',
    '.kkkkkkkkyk.',
    '..kyyyyyyk..',
    '..kykkkkyk..',
    '..kyyyyyyk..',
    '..kykkkyyk..',
    '..kyyyyyyk..',
    '..kykkkkyk..',
    '.kkkkkkkkyk.',
    '.kyyyyyyyyk.',
    '..kkkkkkkk..',
  ],
};

// Interface icons (12 x 12, drawn in currentColor) -----------------------

export const UI = {
  cart: [
    '............',
    'kk..........',
    '.k..........',
    '.kkkkkkkkkkk',
    '.kk.k.k.k.kk',
    '..kkkkkkkkk.',
    '..kk.k.k.kk.',
    '...kkkkkkk..',
    '...k........',
    '...kkkkkkkk.',
    '....kk...kk.',
    '....kk...kk.',
  ],
  soundOn: [
    '............',
    '.....k......',
    '....kk...k..',
    '...kkk....k.',
    'kkkkkk..k.k.',
    'kkkkkk...k.k',
    'kkkkkk...k.k',
    'kkkkkk..k.k.',
    '...kkk....k.',
    '....kk...k..',
    '.....k......',
    '............',
  ],
  soundOff: [
    '............',
    '.....k......',
    '....kk......',
    '...kkk......',
    'kkkkkk.k...k',
    'kkkkkk..k.k.',
    'kkkkkk...k..',
    'kkkkkk..k.k.',
    '...kkk.k...k',
    '....kk......',
    '.....k......',
    '............',
  ],
  list: [
    '............',
    'kk.kkkkkkkkk',
    'kk.kkkkkkkkk',
    '............',
    'kk.kkkkkkkkk',
    'kk.kkkkkkkkk',
    '............',
    'kk.kkkkkkkkk',
    'kk.kkkkkkkkk',
    '............',
    'kk.kkkkkkkkk',
    'kk.kkkkkkkkk',
  ],
  close: [
    '............',
    '.kk......kk.',
    '.kkk....kkk.',
    '..kkk..kkk..',
    '...kkkkkk...',
    '....kkkk....',
    '....kkkk....',
    '...kkkkkk...',
    '..kkk..kkk..',
    '.kkk....kkk.',
    '.kk......kk.',
    '............',
  ],
  check: [
    '............',
    '..........kk',
    '.........kkk',
    '........kkk.',
    '.......kkk..',
    'kk....kkk...',
    'kkk..kkk....',
    '.kkkkkk.....',
    '..kkkk......',
    '...kk.......',
    '............',
    '............',
  ],
  proof: [
    '.kkkkkk.....',
    '.k....kk....',
    '.k....k.k...',
    '.k....kkkk..',
    '.k.......k..',
    '.k......kk..',
    '.k.k...kk...',
    '.k.kk.kk.k..',
    '.k..kkk..k..',
    '.k...k...k..',
    '.k.......k..',
    '.kkkkkkkkk..',
  ],
  pause: [
    '............',
    '..kkk..kkk..',
    '..kkk..kkk..',
    '..kkk..kkk..',
    '..kkk..kkk..',
    '..kkk..kkk..',
    '..kkk..kkk..',
    '..kkk..kkk..',
    '..kkk..kkk..',
    '..kkk..kkk..',
    '..kkk..kkk..',
    '............',
  ],
  play: [
    '............',
    '..kk........',
    '..kkkk......',
    '..kkkkkk....',
    '..kkkkkkkk..',
    '..kkkkkkkkk.',
    '..kkkkkkkkk.',
    '..kkkkkkkk..',
    '..kkkkkk....',
    '..kkkk......',
    '..kk........',
    '............',
  ],
  back: [
    '............',
    '....k.......',
    '...kk.......',
    '..kkk.......',
    '.kkkkkkkkkk.',
    'kkkkkkkkkkk.',
    'kkkkkkkkkkk.',
    '.kkkkkkkkkk.',
    '..kkk.......',
    '...kk.......',
    '....k.......',
    '............',
  ],
  copy: [
    '............',
    '.kkkkkkk....',
    '.k.....k....',
    '.k..kkkkkkk.',
    '.k..k.....k.',
    '.k..k.....k.',
    '.kkkk.....k.',
    '....k.....k.',
    '....k.....k.',
    '....kkkkkkk.',
    '............',
    '............',
  ],
};
