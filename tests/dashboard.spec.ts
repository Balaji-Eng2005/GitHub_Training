import { expect, test, type Page } from '@playwright/test';

/**
 * Opens the Fleet Telemetry dashboard and waits for the main heading to render.
 */
async function openDashboard(page: Page): Promise<void> {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Fleet Telemetry Dashboard' }),
  ).toBeVisible();
}

test.describe('Fleet telemetry dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await openDashboard(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({
        path: `test-results/${testInfo.title}-failure.png`,
        fullPage: true,
      });
    }
  });

  test('displays the fleet dashboard summary metrics and selected vehicle state', async ({
    page,
  }) => {
    await expect(page.getByText('Vehicles online')).toBeVisible();
    await expect(page.getByText('Average speed')).toBeVisible();
    await expect(page.getByText('Battery health')).toBeVisible();
    await expect(page.getByText('Active routes')).toBeVisible();

    await expect(
      page.getByRole('button', { name: /VH-204.*Active.*66 km\/h.*82% battery/i }),
    ).toHaveClass(/active/);

    await expect(page.getByText('Tracking')).toBeVisible();
    await expect(page.getByText('Nominal')).toBeVisible();
  });

  test('updates the telemetry card when a different vehicle is selected', async ({ page }) => {
    const selectedVehicle = page.getByRole('button', { name: /VH-318.*Warning.*48 km\/h.*51% battery/i });

    await selectedVehicle.click();

    await expect(page.getByRole('button', { name: /VH-318.*Warning.*48 km\/h.*51% battery/i })).toHaveClass(
      /active/,
    );
    await expect(page.getByText('Low')).toBeVisible();
    await expect(page.getByText('48')).toBeVisible();
    await expect(page.getByText('51%')).toBeVisible();
  });

  test('renders the fleet map and both telemetry trend charts for the selected vehicle', async ({
    page,
  }) => {
    await expect(page.getByRole('img', { name: 'Vehicle route map' })).toBeVisible();
    await expect(page.getByText('Speed trend')).toBeVisible();
    await expect(page.getByText('Battery trend')).toBeVisible();

    const speedChart = page.getByText('Speed trend').locator('xpath=ancestor::*[contains(@class, "panel-block")][1]//canvas');
    const batteryChart = page.getByText('Battery trend').locator('xpath=ancestor::*[contains(@class, "panel-block")][1]//canvas');

    await expect(speedChart).toBeVisible();
    await expect(batteryChart).toBeVisible();
  });
});
