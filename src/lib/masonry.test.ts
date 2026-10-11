import { describe, expect, it } from 'vitest'
import { columnsFor, layoutMasonry } from './masonry'

describe('layoutMasonry', () => {
  it('splits width into equal columns with gaps', () => {
    const { items } = layoutMasonry([1, 1, 1], 320, 3, 10)
    expect(items.map((i) => i.x)).toEqual([0, 110, 220])
    expect(items.every((i) => i.width === 100 && i.height === 100)).toBe(true)
  })

  it('drops each item into the shortest column', () => {
    // tall, square, square: the third should go under the short square
    const { items, height } = layoutMasonry([0.5, 1, 1], 210, 2, 10)
    expect(items[2]).toMatchObject({ column: 1, y: 110 })
    expect(height).toBe(210)
  })

  it('prefers the leftmost column on ties', () => {
    const { items } = layoutMasonry([1, 1, 1, 1], 210, 2, 10)
    expect(items.map((i) => i.column)).toEqual([0, 1, 0, 1])
  })

  it('never makes more columns than items', () => {
    const { items } = layoutMasonry([1], 300, 3, 10)
    expect(items[0]!.width).toBe(300)
  })

  it('handles an empty gallery', () => {
    expect(layoutMasonry([], 300, 3, 10)).toEqual({ items: [], height: 0 })
  })
})

describe('columnsFor', () => {
  it('picks columns from the container width', () => {
    expect(columnsFor(340)).toBe(1)
    expect(columnsFor(390)).toBe(2)
    expect(columnsFor(1100)).toBe(3)
  })
})
