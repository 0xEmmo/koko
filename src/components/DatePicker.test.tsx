import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { monthGrid } from '../lib/calendar'
import { DatePicker } from './DatePicker'

describe('monthGrid', () => {
  it('starts weeks on Monday and pads the edges', () => {
    // October 2026 starts on a Thursday
    const weeks = monthGrid('2026-10-01')
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(weeks.at(-1)!.filter(Boolean).at(-1)).toBe('2026-10-31')
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })
})

describe('DatePicker', () => {
  const counts = new Map([
    ['2026-10-12', 4],
    ['2026-10-13', 0],
    ['2026-10-14', 1],
    ['2026-10-20', 6],
    ['2026-11-02', 3],
  ])

  const setup = (onChange = vi.fn()) => {
    render(<DatePicker value={null} onChange={onChange} slotCounts={counts} min="2026-10-11" max="2026-12-05" today="2026-10-11" />)
    return { onChange, user: userEvent.setup() }
  }

  it('labels days with how many times are free', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Monday 12 October, 4 times free' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tuesday 13 October, nothing free' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: /Sunday 11 October, today/ })).toBeInTheDocument()
  })

  it('selects available days only', async () => {
    const { onChange, user } = setup()
    await user.click(screen.getByRole('button', { name: /Tuesday 13 October/ }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Wednesday 14 October/ }))
    expect(onChange).toHaveBeenCalledWith('2026-10-14')
  })

  it('has a single tab stop and moves with the arrow keys', async () => {
    const { user, onChange } = setup()
    await user.tab() // next-month button
    await user.tab()
    expect(document.activeElement).toHaveAttribute('data-date', '2026-10-11')
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toHaveAttribute('data-date', '2026-10-12')
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toHaveAttribute('data-date', '2026-10-19')
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onChange).toHaveBeenCalledWith('2026-10-20')
  })

  it('pages to the next month and refuses to go before the minimum', async () => {
    const { user } = setup()
    await user.tab()
    await user.tab()
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toHaveAttribute('data-date', '2026-10-11')
    await user.keyboard('{PageDown}')
    expect(document.activeElement).toHaveAttribute('data-date', '2026-11-11')
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument()
  })

  it('jumps to the first free day when changing month with the buttons', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('button', { name: /Monday 2 November/ })).toHaveAttribute('tabindex', '0')
  })
})
