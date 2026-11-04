import { test, type Page } from '@playwright/test';
import * as path from 'path';

test.describe('Faz R5: Üretim Ekran Görüntüleri Yakalama (Port 8080)', () => {
  const artifactDir = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\b7d1c8b5-7307-48ce-840e-28602d18dea6';
  const ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || 'YeniGucluAdmin2026!';

  async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  test('Capture Faz R5 Production Screenshots', async ({ page }) => {
    // 1. Login Screen (Unauthenticated)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForSelector('#login-username');
    await page.screenshot({ path: path.join(artifactDir, '27-r5-login.png'), fullPage: true });

    // Login as Admin
    await loginAsAdmin(page);

    // 2. Dashboard View
    await page.waitForSelector('h1:has-text("Yönetici Gösterge Paneli")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '28-r5-dashboard.png'), fullPage: true });

    // 3. Asset Detail Modal
    await page.goto('/assets');
    await page.waitForSelector('table tbody tr');
    await page.waitForTimeout(500);
    // Click detail button on first row (eye icon or row action)
    const firstRowDetailBtn = page.locator('table tbody tr').first().locator('button[title*="Detay"], button:has-text("Detay")').first();
    if (await firstRowDetailBtn.isVisible()) {
      await firstRowDetailBtn.click();
    } else {
      // Click first action button or row
      await page.locator('table tbody tr td').first().click();
    }
    await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '29-r5-asset-detail.png'), fullPage: true });

    // Close detail modal
    const closeBtn = page.locator('button:has-text("Kapat"), button[aria-label="Kapat"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(300);

    // 4. Users View
    await page.goto('/users');
    await page.waitForSelector('table tbody tr');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '30-r5-users.png'), fullPage: true });

    // 5. 404 Not Found Page
    await page.goto('/olmayan-bir-sayfa-rotasi-xyz');
    await page.waitForSelector('text=404 - SAYFA BULUNAMADI');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '31-r5-404-notfound.png'), fullPage: true });

    // 6. Mobile View (Viewport: iPhone / Mobile 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Yönetici Gösterge Paneli")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '32-r5-mobile.png'), fullPage: true });
  });
});

