import { test, expect } from '@playwright/test'

/**
 * Post-deploy smoke tests. Deliberately tiny — just enough to catch a bad
 * deploy before users do. Run against a real deployed URL by setting
 * E2E_BASE_URL in the env.
 *
 * These tests don't hit the backend directly; anything requiring real user
 * data (upload photo, match face, pay) is covered by backend integration
 * tests. What we verify here is that the SPA actually loads, routes work,
 * and the first couple of user-facing screens render without JS errors.
 */

test.describe('smoke', () => {
  test('landing page renders and has no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')
    await expect(page).toHaveTitle(/PicSonar|EventFaceMatch/i)

    // CTA link to login or register should be reachable.
    const anyCta = page.getByRole('link').first()
    await expect(anyCta).toBeVisible()

    expect(errors, `console errors on landing: ${errors.join(' | ')}`).toEqual(
      [],
    )
  })

  test('login route renders its form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading')).toBeVisible()
    // Email + password inputs should exist.
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('register route renders its form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('unknown route returns 404 page', async ({ page }) => {
    const res = await page.goto('/this-route-does-not-exist-123')
    // SPA serves index.html for everything, so HTTP status is 200; we check
    // that the React NotFoundPage rendered.
    expect(res?.ok()).toBe(true)
    await expect(page.getByText(/404|not found/i)).toBeVisible()
  })
})
