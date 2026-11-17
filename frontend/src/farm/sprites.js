/**
 * Sprites originais em pixel art (grades de caracteres). '.' = transparente.
 */

// ---------- animais ----------

export const CHICKEN = {
  rows: [
    '...rr.....',
    '..wwww....',
    'ywkwww....',
    '..wwww...w',
    '..wwwwwwww',
    '..wwwwwgww',
    '...wwwwww.',
    '....y..y..',
  ],
  palette: { r: '#d9381e', w: '#fbfbf2', k: '#2b1a0b', y: '#f2b600', g: '#d8d8c8' },
};

export const CHICKEN_BROWN = { rows: CHICKEN.rows, palette: { ...CHICKEN.palette, w: '#d9a066', g: '#b5814a' } };

export const CHICKEN_SCARED = {
  rows: [
    '...rr.....',
    '..wwww.w.w',
    'ywkwwwwwww',
    '..wwwwwww.',
    '..wwwwwwww',
    '..wwwwwgww',
    '...wwwwww.',
    '...y....y.',
  ],
  palette: CHICKEN.palette,
};

export const COW = {
  rows: [
    'hh..............',
    'wwww............',
    'wkww.wwwbbwwwww.',
    'wwwwwwwwbbbwwwwt',
    'pwwwbbwwwwwwwwwt',
    '.wwwbbwwwwwbbww.',
    '..wwwwwwwwwbbww.',
    '..ww.ww...ww.ww.',
    '..kk.kk...kk.kk.',
  ],
  palette: { h: '#e8d8a8', w: '#fbfbf2', b: '#7a4a2a', k: '#2b1a0b', p: '#f2a0a0', t: '#7a4a2a' },
};

export const COW_RESTING = {
  rows: [
    '................',
    '................',
    'hh..............',
    'wwww............',
    'wkww.wwwbbwwwww.',
    'wwwwwwwwbbbwwwwt',
    'pwwwbbwwwwwwwwwt',
    '.wwwbbwwwwwbbww.',
    '..ssssssssssss..',
  ],
  palette: { ...COW.palette, s: 'rgba(0,0,0,.25)' },
};

export const PIG = {
  rows: [
    '...e........',
    '..pppppppp..',
    'nkppppppppqt',
    'nppppppppppt',
    '..pppppppp..',
    '..dd....dd..',
  ],
  palette: { e: '#e57f9a', p: '#f5a8bd', n: '#e57f9a', k: '#2b1a0b', q: '#e88fa8', t: '#e57f9a', d: '#8a4b5a' },
};

export const DUCK = {
  rows: [
    '..ww.....',
    '.kww.....',
    'oowww..ww',
    '..wwwwwww',
    '..wwwwwww',
    '...wwwww.',
  ],
  palette: { w: '#fbfbf2', k: '#2b1a0b', o: '#f2a000' },
};

// ---------- objetos ----------

export const CART = {
  rows: [
    '.bbbbbbbbbbbbbbb...',
    '.bBBBBBBBBBBBBBb...',
    '.bBccBBccBBccBBb...',
    '.bbbbbbbbbbbbbbbhhh',
    '...ww.......ww.....',
    '..wkkw.....wkkw....',
    '...ww.......ww.....',
  ],
  palette: { b: '#6b3a12', B: '#a8662a', c: '#f6dca0', h: '#5a3008', w: '#3b2412', k: '#b8691c' },
};

export const MAILBOX = {
  rows: [
    '.rrrrrr.',
    'rRRRRRRr',
    'rRRRRRRr',
    'rrrrrrrr',
    '...ww...',
    '...ww...',
    '...ww...',
    '...ww...',
  ],
  palette: { r: '#7a1f12', R: '#c9503a', w: '#6b4a2a' },
};

export const LETTER = {
  rows: ['wwwwww', 'wkwwkw', 'wwkkww', 'wwwwww'],
  palette: { w: '#fff3c4', k: '#b3402a' },
};

// ---------- ícones de conquista (12x12) ----------

const P = {
  k: '#3b2412', g: '#3fae49', G: '#2e7d3a', y: '#ffd23f', Y: '#d9a400', o: '#e8861a', O: '#b35a10', w: '#fff3c4',
  b: '#8a4b0f', B: '#5a3008', s: '#b0b0b0', S: '#6d6d6d', r: '#d9381e', u: '#3a6fb8', p: '#c46ad9', c: '#f5f5f5', t: '#7ad6c9',
};

export const ICONS = {
  seed: {
    rows: ['............', '.....gg.....', '....gGGg....', '.....gg.....', '.....G......', '.....G......', '...bbbbbb...', '..bBBBBBBb..', '..bBkBBkBb..', '..bBBBBBBb..', '...bbbbbb...', '............'],
    palette: P,
  },
  hoe: {
    rows: ['........ss..', '.......sSs..', '......sSs...', '.....bb.....', '....bb......', '...bb.......', '..bb........', '.bb.........', 'bb..........', '............', '............', '............'],
    palette: P,
  },
  medal: {
    rows: ['..uu....rr..', '...uu..rr...', '....urrr....', '.....yy.....', '....yYYy....', '...yYyyYy...', '...yYyyYy...', '....yYYy....', '.....yy.....', '............', '............', '............'],
    palette: P,
  },
  pumpkin: {
    rows: ['.....G......', '.....gG.....', '..oooOooo...', '.oOooOooOo..', 'oOoooOoooOo.', 'oOoooOoooOo.', 'oOoooOoooOo.', '.oOooOooOo..', '..ooooooo...', '............', '............', '............'],
    palette: P,
  },
  silo: {
    rows: ['....ssss....', '...sSSSSs...', '..ssssssss..', '..swwwwwws..', '..swyyyyws..', '..swyyyyws..', '..swyyyyws..', '..swyyyyws..', '..ssssssss..', '..bb....bb..', '............', '............'],
    palette: P,
  },
  tea: {
    rows: ['............', '....w..w....', '.....w..w...', '............', '..cccccccc..', '..cttttttcc.', '..cttttttc.c', '..cttttttcc.', '...cccccc...', '.bbbbbbbbbb.', '............', '............'],
    palette: P,
  },
  gear: {
    rows: ['.....ss.....', '..s.ssss.s..', '..ssSSSSss..', '...sS..Ss...', '.ssS....Sss.', '.ssS....Sss.', '...sS..Ss...', '..ssSSSSss..', '..s.ssss.s..', '.....ss.....', '............', '............'],
    palette: P,
  },
  star: {
    rows: ['.....yy.....', '.....yy.....', '....yYYy....', 'yyyyyYYyyyyy', '.yyyYYYYyyy.', '..yyYYYYyy..', '...yyYYyy...', '..yyy..yyy..', '..yy....yy..', '.yy......yy.', '............', '............'],
    palette: P,
  },
  house: {
    rows: ['.....rr.....', '....rrrr....', '...rrrrrr...', '..rrrrrrrr..', '.rrrrrrrrrr.', '..bbbbbbbb..', '..bwwbbwwb..', '..bwwbbwwb..', '..bbbBBbbb..', '..bbbBBbbb..', '............', '............'],
    palette: P,
  },
  book: {
    rows: ['............', '.BBBBBBBBB..', '.BwwwwwwwBb.', '.BwkkkkwwBb.', '.BwwwwwwwBb.', '.BwkkkkkwBb.', '.BwwwwwwwBb.', '.BwkkkwwwBb.', '.BBBBBBBBBb.', '..bbbbbbbbb.', '............', '............'],
    palette: P,
  },
  lock: {
    rows: ['............', '....SSSS....', '...S....S...', '...S....S...', '..ssssssss..', '..sSSSSSSs..', '..sSSkkSSs..', '..sSSkkSSs..', '..sSSSSSSs..', '..ssssssss..', '............', '............'],
    palette: P,
  },
};
