import { test, expect } from '@playwright/test';

test('public root is a marketing portal, not the organiser dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/photos|videos/i);
  await expect(page.locator('.portal-price-line')).toContainText('30 €');
  await expect(page.getByRole('link', { name: /Créer mon événement/i }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /Rejoindre un événement/i })).toBeVisible();
});

test('guest access makes public link and private credential paths explicit', async ({ page }) => {
  await page.goto('/');
  const tabs = page.locator('.portal-access-card .portal-tabs button');
  const publicTab = tabs.nth(0);
  const privateTab = tabs.nth(1);
  await expect(tabs).toHaveCount(2);
  await expect(publicTab).toHaveAttribute('aria-pressed', 'true');
  await privateTab.click();
  await expect(privateTab).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#portal-guest-id')).toBeVisible();
  await expect(page.locator('#portal-guest-password')).toBeVisible();
});

test('legal and trust pages are linked from the footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Confidentialité/i })).toHaveAttribute('href', './privacy.html');
  await expect(page.getByRole('link', { name: /Conditions/i })).toHaveAttribute('href', './terms.html');
  await expect(page.getByRole('link', { name: /Mentions légales/i })).toHaveAttribute('href', './legal.html');
});
