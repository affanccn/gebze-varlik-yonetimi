import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const screenshotsDir = path.resolve('e2e-screenshots');
const artifactsDir = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\b7d1c8b5-7307-48ce-840e-28602d18dea6';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('#login-username').fill('admin');
  await page.locator('#login-password').fill(process.env.APP_ADMIN_PASSWORD || 'YeniGucluAdmin2026!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard');
}

function copyToArtifacts(filename: string) {
  const src = path.join(screenshotsDir, filename);
  const dst = path.join(artifactsDir, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
  }
}

test('Capture R3b Visual Screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);

  // 1. Assignments Table
  await page.goto('/assignments');
  await page.waitForSelector('table tbody tr');
  await expect(page.locator('h1')).toContainText('Zimmet ve Taşınır Tahsis Yönetimi');
  await page.waitForTimeout(500);

  const file1 = '14-r3b-assignments.png';
  await page.screenshot({ path: path.join(screenshotsDir, file1) });
  copyToArtifacts(file1);

  // 2. Assignment Form Modal
  await page.locator('button:has-text("Yeni Zimmet Fişi Düzenle")').click();
  const assignModal = page.locator('div[role="dialog"]');
  await expect(assignModal).toBeVisible();
  await page.waitForTimeout(500);

  const file2 = '15-r3b-assignment-form-modal.png';
  await page.screenshot({ path: path.join(screenshotsDir, file2) });
  copyToArtifacts(file2);

  await page.keyboard.press('Escape');
  await expect(assignModal).not.toBeVisible();

  // 3. Maintenances Table
  await page.goto('/maintenances');
  await page.waitForSelector('table tbody tr');
  await expect(page.locator('h1')).toContainText('Bakım, Onarım ve Teknik Servis İş Emirleri');
  await page.waitForTimeout(500);

  const file3 = '16-r3b-maintenances.png';
  await page.screenshot({ path: path.join(screenshotsDir, file3) });
  copyToArtifacts(file3);

  // 4. Maintenance Form Modal
  await page.locator('button:has-text("Yeni Bakım Talebi Aç")').click();
  const maintModal = page.locator('div[role="dialog"]');
  await expect(maintModal).toBeVisible();
  await page.waitForTimeout(500);

  const file4 = '17-r3b-maintenance-form-modal.png';
  await page.screenshot({ path: path.join(screenshotsDir, file4) });
  copyToArtifacts(file4);

  await page.keyboard.press('Escape');
  await expect(maintModal).not.toBeVisible();

  // 5. Stock Table
  await page.goto('/stock');
  await page.waitForSelector('table tbody tr');
  await expect(page.locator('h1')).toContainText('Depo ve Sarf Malzeme Stok Yönetimi');
  await page.waitForTimeout(500);

  const file5 = '18-r3b-stock.png';
  await page.screenshot({ path: path.join(screenshotsDir, file5) });
  copyToArtifacts(file5);

  // 6. Stock Tx Modal
  await page.locator('button[data-action="new-stock-tx"]').click();
  const stockModal = page.locator('div[role="dialog"]');
  await expect(stockModal).toBeVisible();
  await page.waitForTimeout(500);

  const file6 = '19-r3b-stock-tx-modal.png';
  await page.screenshot({ path: path.join(screenshotsDir, file6) });
  copyToArtifacts(file6);

  await page.keyboard.press('Escape');
  await expect(stockModal).not.toBeVisible();

  // 7. Bulk Import Modal
  await page.goto('/assets');
  await page.waitForSelector('table tbody tr');
  await page.locator('#btn-open-bulk-import').click();
  const importModal = page.locator('div[role="dialog"]');
  await expect(importModal).toBeVisible();
  await page.waitForTimeout(500);

  const file7 = '20-r3b-bulk-import-modal.png';
  await page.screenshot({ path: path.join(screenshotsDir, file7) });
  copyToArtifacts(file7);

  await page.keyboard.press('Escape');
  await expect(importModal).not.toBeVisible();
});

