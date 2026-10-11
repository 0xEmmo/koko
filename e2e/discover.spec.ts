import { expect, expectAccessible, isMobile, test } from './fixtures'

test('lists creatives and filters by craft', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Book the hands')
  await expect(page.getByRole('article')).toHaveCount(8)
  await expectAccessible(page)

  await page.getByRole('button', { name: 'Barbers' }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(page).toHaveURL(/craft=barbering/)
})

test('search narrows results and shows an empty state', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox').fill('knotless')
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Amaka Obi' })).toBeVisible()

  await page.getByRole('searchbox').fill('plumber')
  await expect(page.getByText('Nobody matches that yet')).toBeVisible()
  await page.getByRole('button', { name: 'Clear search and filters' }).click()
  await expect(page.getByRole('article')).toHaveCount(8)
})

test('secondary filters live in a sheet on mobile and inline on desktop', async ({ page }) => {
  await page.goto('/')
  if (isMobile(page)) {
    await page.getByRole('button', { name: /Filters/ }).click()
    await page.getByRole('dialog').getByLabel('City').selectOption('Abuja')
    await page.getByRole('dialog').getByRole('button', { name: /Show/ }).click()
  } else {
    await page.getByLabel('City').selectOption('Abuja')
  }
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Musa Garba' })).toBeVisible()
})

test('saving a creative persists across reloads', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Save Tobi Adeyemi' }).click()
  await expect(page.getByRole('button', { name: 'Save Tobi Adeyemi' })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await page.getByRole('link', { name: /Saved/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Tobi Adeyemi' })).toBeVisible()
})

test('shows an error with retry when the network is down', async ({ page }) => {
  await page.goto('/?network=offline')
  await expect(page.getByRole('alert')).toContainText('No connection')
})
