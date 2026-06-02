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

test('broadcasts tester-supplied Newsletter text through the same relevance flow', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Newsletters' }).click();
  await page.getByLabel('Custom Newsletter title').fill('Tester HFrEF Service Update');
  await page.getByLabel('Custom Newsletter source').fill('Prototype tester');
  await page.getByLabel('Custom Newsletter topic').fill('Cardiology');
  await page
    .getByLabel('Custom Newsletter key takeaway')
    .fill('Pasted service update focused on HFrEF discharge follow-up.');
  await page
    .getByLabel('Custom Newsletter text')
    .fill(
      'This pasted newsletter describes heart failure with reduced ejection fraction, SGLT2 inhibitor use in heart failure, iron deficiency in heart failure, renal dosing review, and a post-discharge medication optimization checklist.'
    );
  await page.getByRole('button', { name: 'Use custom newsletter' }).click();

  await expect(page.getByRole('heading', { name: 'Tester HFrEF Service Update' })).toBeVisible();
  await page.getByRole('button', { name: 'Check relevance for all HCPs' }).click();

  await expect(page.getByText('1 push ready')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('5/5 HCP profiles checked, 4 no-push')).toBeVisible();

  await page.getByRole('button', { name: 'HCP App' }).click();
  await expect(page.getByLabel('Smartphone-style HCP Inbox')).toContainText('Tester HFrEF Service Update');
});

test('lets presenters edit an HCP filter and rerun relevance with the updated profile', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /Dr\. Noah Fischer/ }).click();
  await page.getByLabel('Add filter trait').fill('EGFR-positive metastatic lung cancer');
  await page.getByRole('button', { name: 'Add filter trait' }).click();

  await page.getByRole('button', { name: 'Check relevance' }).click();

  await expect(page.getByText('Push-Worthy')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel('Smartphone-style HCP Inbox')).toContainText(
    'EGFR Lung Cancer Therapy Update'
  );
  await expect(page.getByText('EGFR-positive metastatic lung cancer').first()).toBeVisible();
});
