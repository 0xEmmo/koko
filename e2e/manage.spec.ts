import { expect, expectAccessible, test } from './fixtures'

test('reschedules and then cancels the seeded upcoming booking', async ({ page }) => {
  await page.goto('/bookings')
  await expectAccessible(page)
  await page.getByRole('link', { name: 'Retwist and style' }).click()
  await expect(page.getByRole('heading', { name: 'Retwist and style', level: 1 })).toBeVisible()

  await page.getByRole('button', { name: 'Reschedule' }).click()
  const dialog = page.getByRole('dialog', { name: 'Pick a new time' })
  await dialog.locator('fieldset label:has(input[type=radio])').nth(1).click()
  await dialog.getByRole('button', { name: /^Move to/ }).click()
  await expect(page.getByText(/^Moved to/)).toBeVisible()
  await expect(page.getByText(/Moved from/)).toBeVisible()

  await page.getByRole('button', { name: 'Cancel booking' }).click()
  const cancel = page.getByRole('dialog', { name: 'Cancel this booking?' })
  await expect(cancel).toContainText('deposit back in full')
  await cancel.getByRole('button', { name: 'Cancel booking' }).click()
  await expect(page.locator('.pill', { hasText: 'Cancelled' })).toBeVisible()
  await expect(page.getByText(/back in 3–5 working days/)).toBeVisible()
})

test('past bookings tab and empty upcoming state', async ({ page }) => {
  await page.goto('/bookings?tab=past')
  await expect(page.getByRole('tab', { name: /Past/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('link', { name: 'Skin fade' })).toBeVisible()
})

test('studio can block a day off', async ({ page }) => {
  await page.goto('/studio')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kay')
  await expectAccessible(page)
  // Kay is booked solid for a fortnight, so switch to a quieter diary
  await page.getByLabel('Viewing as').selectOption('cr_musa')
  // days that already have bookings refuse; pick a quiet one
  const quiet = page.locator('li').filter({ has: page.getByRole('switch') }).filter({ hasNotText: 'booked' }).first()
  const dayOff = quiet.getByRole('switch')
  await dayOff.click()
  await expect(dayOff).toBeChecked()
  await expect(page.getByText(/blocked off/)).toBeVisible()
})

test('credits page lists every photographer', async ({ page }) => {
  await page.goto('/credits')
  await expect(page.getByRole('heading', { name: 'Photo credits' })).toBeVisible()
  expect(await page.locator('main li').count()).toBeGreaterThan(100)
})

test('ships a web app manifest and service worker', async ({ page, request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3)
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r))).toBe(true)
})

test('refuses to block a day that already has bookings', async ({ page }) => {
  await page.goto('/studio')
  const busy = page.locator('li').filter({ has: page.getByRole('switch') }).filter({ hasText: 'booked' }).first()
  await busy.getByRole('switch').click()
  await expect(page.getByText('You already have bookings that day')).toBeVisible()
  await expect(busy.getByRole('switch')).not.toBeChecked()
})
