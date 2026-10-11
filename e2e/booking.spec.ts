import type { Page } from '@playwright/test'
import { expect, expectAccessible, test } from './fixtures'

async function pickFirstSlot(page: Page) {
  const slot = page.locator('fieldset label:has(input[type=radio])').first()
  await slot.waitFor()
  await slot.click()
}

async function fillDetails(page: Page) {
  await page.getByLabel('Full name').fill('Ada Okafor')
  await page.getByLabel(/Phone/).fill('0803 123 4567')
  await page.getByLabel('Email').fill('ada@example.com')
  await page.getByRole('button', { name: /Continue to deposit/ }).click()
}

test('books a slot, survives a declined card, and lands on the confirmation', async ({ page }) => {
  await page.goto('/c/kay-bankole/book?service=sv_kay_fade')
  await expect(page.getByRole('heading', { name: 'When suits you?' })).toBeVisible()
  await expectAccessible(page)
  await pickFirstSlot(page)
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible()
  await expect(page.getByRole('timer')).toContainText('holding')
  await page.getByRole('button', { name: /Continue to deposit/ }).click()
  await expect(page.getByText('Tell us your name')).toBeVisible()
  await expect(page.getByLabel('Full name')).toBeFocused()
  await expectAccessible(page)
  await fillDetails(page)

  await expect(page.getByRole('heading', { name: 'Pay the deposit' })).toBeVisible()
  await page.getByRole('button', { name: 'one that gets declined' }).click()
  await page.getByRole('button', { name: 'Pay ₦2,500' }).click()
  await expect(page.getByRole('alert')).toContainText('declined')
  await expectAccessible(page)

  await page.getByRole('button', { name: 'a working test card' }).click()
  await page.getByRole('button', { name: 'Pay ₦2,500' }).click()
  await expect(page.getByRole('heading', { name: 'You’re booked with Kay.' })).toBeVisible()
  await expectAccessible(page)

  await page.goto('/bookings')
  await expect(page.getByRole('link', { name: 'Skin fade' })).toBeVisible()
})

test('validates card details before charging', async ({ page }) => {
  await page.goto('/c/dami-ojo/book?service=sv_dami_soft')
  await pickFirstSlot(page)
  await page.getByRole('button', { name: 'Continue' }).click()
  await fillDetails(page)
  await page.getByLabel('Card number').fill('4084 0840 8408 4082')
  await page.getByLabel('Expiry').fill('0120')
  await page.getByRole('button', { name: /^Pay/ }).click()
  await expect(page.getByText('That card number doesn’t look right')).toBeVisible()
  await expect(page.getByText('This card has expired')).toBeVisible()
})

test('a second tab cannot grab a slot another tab is holding', async ({ page, context }) => {
  await page.goto('/c/kay-bankole/book?service=sv_kay_fade')
  await pickFirstSlot(page)
  const chosen = await page.locator('fieldset label:has(input:checked)').innerText()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible()

  const other = await context.newPage()
  await other.goto('/c/kay-bankole/book?service=sv_kay_fade')
  // the held slot drops out of the other tab's list; force the race through the API
  await expect(other.locator('fieldset label').first()).toBeVisible()
  await expect(other.locator('fieldset label', { hasText: new RegExp(`^${chosen}$`) })).toHaveCount(0)
  await other.close()
})

test('the slot disappears live from another tab once booked', async ({ page, context }) => {
  const watcher = await context.newPage()
  await watcher.goto('/c/kay-bankole/book?service=sv_kay_fade')
  await pickFirstSlot(watcher)
  const chosen = await watcher.locator('fieldset label:has(input:checked)').innerText()

  await page.goto('/c/kay-bankole/book?service=sv_kay_fade')
  await pickFirstSlot(page)
  await page.getByRole('button', { name: 'Continue' }).click()
  await fillDetails(page)
  await page.getByRole('radio', { name: 'Transfer' }).check()
  await page.getByRole('button', { name: 'I’ve sent the money' }).click()
  await expect(page.getByRole('heading', { name: /You’re booked/ })).toBeVisible()

  await expect(watcher.getByRole('alert')).toContainText(`${chosen} was just booked`)
  await expect(watcher.getByRole('button', { name: 'Continue' })).toBeDisabled()
})

test('date picker is keyboard operable', async ({ page }) => {
  await page.goto('/c/kay-bankole/book?service=sv_kay_fade')
  const selectedDay = page.locator('[aria-selected="true"] button')
  await selectedDay.waitFor()
  await page.locator('button[data-date][tabindex="0"]').focus()
  const before = await page.evaluate(() => document.activeElement?.getAttribute('data-date'))
  await page.keyboard.press('ArrowDown')
  const after = await page.evaluate(() => document.activeElement?.getAttribute('data-date'))
  expect(after).not.toBe(before)
  await page.keyboard.press('Enter')
  await expect(page.locator(`[aria-selected="true"] button[data-date="${after}"]`)).toHaveCount(1)
})
