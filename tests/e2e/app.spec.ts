import { expect, test } from '@playwright/test';

test('runs a fallback Relevance Check and updates the HCP Inbox', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Relevance Engine' })).toBeVisible();
  await expect(page.getByLabel('Smartphone-style HCP Inbox')).toContainText('No pushed updates');

  await page.getByRole('button', { name: 'Check relevance' }).click();

  await expect(page.getByText('Push-Worthy')).toBeVisible();
  await expect(page.getByLabel('Smartphone-style HCP Inbox')).toContainText(
    'EGFR Lung Cancer Therapy Update'
  );
  await expect(page.getByLabel('Smartphone-style HCP Inbox')).toContainText(
    'EGFR-positive metastatic lung cancer'
  );
});

test('checks one Newsletter against all HCPs and pushes only relevant inbox updates', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Newsletters' }).click();
  await expect(page.getByRole('heading', { name: 'Curated Newsletter inputs' })).toBeVisible();

  await page.getByRole('button', { name: 'Check relevance for all HCPs' }).click();

  await expect(page.getByText('1 push ready')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('5/5 HCP profiles checked, 4 no-push')).toBeVisible();

  await page.getByRole('button', { name: 'HCP App' }).click();
  await expect(page.getByLabel('Smartphone-style HCP Inbox')).toContainText(
    'EGFR Lung Cancer Therapy Update'
  );

  await page.getByRole('button', { name: /Dr\. Noah Fischer/ }).click();
  await expect(page.getByLabel('Smartphone-style HCP Inbox')).toContainText('No pushed updates');
});
