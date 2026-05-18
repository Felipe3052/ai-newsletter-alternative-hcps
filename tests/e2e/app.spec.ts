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
