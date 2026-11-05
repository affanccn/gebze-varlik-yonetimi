import { test, type Page } from '@playwright/test';
import * as path from 'path';

test.describe('Faz R4: Ekran Görüntüsü Yakalama', () => {
  const artifactDir = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\b7d1c8b5-7307-48ce-840e-28602d18dea6';

  async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill(process.env.APP_ADMIN_PASSWORD || 'GebzeDev2026!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
  }

  test('Capture Faz R4 Screenshots', async ({ page }) => {
    // Set standard desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);

    // 1. Users View
    await page.goto('/users');
    await page.waitForSelector('table tbody tr');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '21-r4-users.png'), fullPage: true });

    // 2. Fleet View
    await page.goto('/fleet');
    await page.waitForSelector('table tbody tr');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '22-r4-fleet.png'), fullPage: true });

    // 3. Procurement View
    await page.goto('/procurement');
    await page.waitForSelector('table tbody tr');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '23-r4-procurement.png'), fullPage: true });

    // 4. Counting View
    await page.goto('/counting');
    await page.waitForSelector('.audit-session-card');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '24-r4-counting.png'), fullPage: true });

    // 5. Audit Logs View
    await page.goto('/audit');
    await page.waitForSelector('table tbody tr');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '25-r4-audit.png'), fullPage: true });

    // 6. Settings View
    await page.goto('/settings');
    await page.waitForSelector('table tbody tr');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '26-r4-settings.png'), fullPage: true });
  });
});

