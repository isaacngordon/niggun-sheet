/** One physical printed sheet in a saddle-stitch booklet: which source page goes on each half. 0 means blank. */
export interface BookletSheet {
  left: number;
  right: number;
}

/** RTL saddle-stitch imposition: source page 1 ends up on the left half of the first sheet. */
export function computeBookletSheets(srcPageCount: number): BookletSheet[] {
  const padded = Math.ceil(srcPageCount / 4) * 4;
  const totalSheets = padded / 4;
  const pairs: Array<[number, number]> = [];
  for (let sheet = 0; sheet < totalSheets; sheet++) {
    pairs.push([padded - 2 * sheet, 2 * sheet + 1]);
    pairs.push([2 * sheet + 2, padded - 2 * sheet - 1]);
  }
  return pairs.map(([l, r]) => ({
    left: r <= srcPageCount ? r : 0,
    right: l <= srcPageCount ? l : 0,
  }));
}
