import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type Page } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    // Every test gets a fresh browser context, so storage starts empty and the demo seeds itself.
    // Drop the artificial latency; the app reads this before every request.
    await page.addInitScript(() => localStorage.setItem('koko.latency', '0'))
    await use(page)
  },
})

export { expect }

export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 900
