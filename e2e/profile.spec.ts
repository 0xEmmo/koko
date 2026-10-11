import { expect, expectAccessible, test } from './fixtures'

test('profile shows work, services and opens the lightbox', async ({ page }) => {
  await page.goto('/c/amaka-obi')
  await expect(page.getByRole('heading', { name: 'Amaka Obi', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Services' })).toBeVisible()
  await expectAccessible(page)

  await page.getByRole('button', { name: /Open photo 1:/ }).click()
  const viewer = page.getByRole('dialog', { name: 'Photo viewer' })
  await expect(viewer).toBeVisible()
  await expect(viewer.getByText('1 / 11')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(viewer.getByText('2 / 11')).toBeVisible()
  await expect(page).toHaveURL(/photo=1/)
  await page.keyboard.press('Escape')
  await expect(viewer).toBeHidden()
  await expect(page.getByRole('button', { name: /Open photo 1:/ })).toBeFocused()
})

test('unknown creatives get a friendly not-found page', async ({ page }) => {
  await page.goto('/c/nobody-here')
  await expect(page.getByText('We couldn’t find that creative')).toBeVisible()
})
