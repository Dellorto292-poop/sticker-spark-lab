/**
 * Pure-JS barcode encoders for Code128B and Code39.
 * Returns bar positions (in module units) for vector PDF rendering.
 */

export interface BarcodeBars {
  bars: { x: number; w: number }[];
  totalWidth: number;
}

// ─── Code 128B ───────────────────────────────────────────────

const CODE128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112',
];

const START_B = 104;
const STOP = 106;

function patternToBars(pattern: string, xOffset: number): { bars: { x: number; w: number }[]; width: number } {
  const bars: { x: number; w: number }[] = [];
  let x = xOffset;
  for (let i = 0; i < pattern.length; i++) {
    const w = parseInt(pattern[i]);
    if (i % 2 === 0) {
      // bar (even indices)
      bars.push({ x, w });
    }
    x += w;
  }
  return { bars, width: x - xOffset };
}

export function encodeCode128B(text: string): BarcodeBars {
  if (!text) return { bars: [], totalWidth: 0 };

  const values: number[] = [START_B];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 32 || code > 127) continue;
    values.push(code - 32);
  }

  // Check digit
  let sum = values[0];
  for (let i = 1; i < values.length; i++) {
    sum += i * values[i];
  }
  values.push(sum % 103);
  values.push(STOP);

  // Quiet zone
  const quietZone = 10;
  let x = quietZone;
  const allBars: { x: number; w: number }[] = [];

  for (const val of values) {
    const pattern = CODE128_PATTERNS[val];
    const { bars, width } = patternToBars(pattern, x);
    allBars.push(...bars);
    x += width;
  }

  return { bars: allBars, totalWidth: x + quietZone };
}

// ─── Code 39 ─────────────────────────────────────────────────

const CODE39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
const CODE39_PATTERNS: Record<string, string> = {};

// Patterns: 9 elements (BSBSBSBSB), 0=narrow(1), 1=wide(3)
const CODE39_RAW = [
  '000110100', // 0
  '100100001', // 1
  '001100001', // 2
  '101100000', // 3
  '000110001', // 4
  '100110000', // 5
  '001110000', // 6
  '000100101', // 7
  '100100100', // 8
  '001100100', // 9
  '100001001', // A
  '001001001', // B
  '101001000', // C
  '000011001', // D
  '100011000', // E
  '001011000', // F
  '000001101', // G
  '100001100', // H
  '001001100', // I
  '000011100', // J
  '100000011', // K
  '001000011', // L
  '101000010', // M
  '000010011', // N
  '100010010', // O
  '001010010', // P
  '000000111', // Q
  '100000110', // R
  '001000110', // S
  '000010110', // T
  '110000001', // U
  '011000001', // V
  '111000000', // W
  '010010001', // X
  '110010000', // Y
  '011010000', // Z
  '010000101', // -
  '110000100', // .
  '011000100', // (space)
  '010101000', // $
  '010100010', // /
  '010001010', // +
  '000101010', // %
];

// Star (*) = start/stop
const CODE39_STAR = '010010100';

for (let i = 0; i < CODE39_CHARS.length; i++) {
  CODE39_PATTERNS[CODE39_CHARS[i]] = CODE39_RAW[i];
}
CODE39_PATTERNS['*'] = CODE39_STAR;

function code39PatternToBars(nwPattern: string, xOffset: number): { bars: { x: number; w: number }[]; width: number } {
  const bars: { x: number; w: number }[] = [];
  let x = xOffset;
  for (let i = 0; i < 9; i++) {
    const w = nwPattern[i] === '1' ? 3 : 1;
    if (i % 2 === 0) {
      // bar
      bars.push({ x, w });
    }
    x += w;
  }
  return { bars, width: x - xOffset };
}

export function encodeCode39(text: string): BarcodeBars {
  if (!text) return { bars: [], totalWidth: 0 };

  const chars = ['*', ...text.toUpperCase().split('').filter(c => c in CODE39_PATTERNS), '*'];

  const quietZone = 10;
  let x = quietZone;
  const allBars: { x: number; w: number }[] = [];
  const interCharGap = 1;

  for (let i = 0; i < chars.length; i++) {
    const pattern = CODE39_PATTERNS[chars[i]];
    if (!pattern) continue;
    const { bars, width } = code39PatternToBars(pattern, x);
    allBars.push(...bars);
    x += width;
    if (i < chars.length - 1) x += interCharGap;
  }

  return { bars: allBars, totalWidth: x + quietZone };
}

export function encodeBarcode(text: string, type: 'code128' | 'code39'): BarcodeBars {
  return type === 'code128' ? encodeCode128B(text) : encodeCode39(text);
}
