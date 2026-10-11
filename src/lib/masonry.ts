export interface Placed {
  x: number
  y: number
  width: number
  height: number
  column: number
}

/**
 * Greedy masonry: each item goes into the currently shortest column. Because
 * every photo's aspect ratio is known up front we can lay the grid out before
 * a single image loads, so nothing jumps around as they stream in. Items stay
 * in source order in the DOM, which keeps tab and screen-reader order sane.
 */
export function layoutMasonry(ratios: readonly number[], containerWidth: number, columns: number, gap: number) {
  const cols = Math.max(1, Math.min(columns, ratios.length || 1))
  const width = (containerWidth - gap * (cols - 1)) / cols
  const heights = new Array<number>(cols).fill(0)
  const items: Placed[] = ratios.map((ratio) => {
    let column = 0
    for (let c = 1; c < cols; c++) if (heights[c]! < heights[column]! - 0.5) column = c
    const height = width / ratio
    const placed = { x: column * (width + gap), y: heights[column]!, width, height, column }
    heights[column] = heights[column]! + height + gap
    return placed
  })
  const height = Math.max(0, ...heights.map((h) => h - gap))
  return { items, height }
}

export function columnsFor(width: number) {
  if (width >= 720) return 3
  if (width >= 360) return 2
  return 1
}
