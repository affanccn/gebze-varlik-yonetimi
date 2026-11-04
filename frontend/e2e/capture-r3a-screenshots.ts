import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const screenshotsDir = path.resolve('e2e-screenshots');
const artifactsDir = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\b7d1c8b5-7307-48ce-840e-28602d18dea6';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('#login-username').fill('admin');
  await page.locator('#login-password').fill('YeniGucluAdmin2026!');
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

test('Capture R3a Visual Screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);

  // 1. Assets Table
  await page.goto('/assets');
  await page.waitForSelector('table tbody tr');
  await expect(page.locator('h1')).toContainText('Demirbaş ve Varlık Envanteri');
  await page.waitForTimeout(500);

  const file1 = '09-r3a-assets-table.png';
  await page.screenshot({ path: path.join(screenshotsDir, file1) });
  copyToArtifacts(file1);

  // 2. Asset Detail Modal
  await page.locator('button[title="Detay Görüntüle"]').first().click();
  const detailModal = page.locator('div[role="dialog"]');
  await expect(detailModal).toBeVisible();
  await expect(detailModal.locator('text=Kurumsal Yaşam Döngüsü İlerlemesi')).toBeVisible();
  await page.waitForTimeout(600);

  const file2 = '10-r3a-asset-detail-modal.png';
  await page.screenshot({ path: path.join(screenshotsDir, file2) });
  copyToArtifacts(file2);

  // Close detail modal
  await page.keyboard.press('Escape');
  await expect(detailModal).not.toBeVisible();

  // 3. Asset Form Modal (Yeni Varlık Kaydı)
  await page.locator('button:has-text("Yeni Varlık Ekle")').click();
  const formModal = page.locator('div[role="dialog"]');
  await expect(formModal).toBeVisible();
  await expect(formModal.locator('h3:has-text("Yeni Varlık Kaydı")')).toBeVisible();
  await page.waitForTimeout(500);

  const file3 = '11-r3a-asset-form-modal.png';
  await page.screenshot({ path: path.join(screenshotsDir, file3) });
  copyToArtifacts(file3);

  // Close form modal
  await page.keyboard.press('Escape');
  await expect(formModal).not.toBeVisible();

  // 4. Asset Transfer Modal
  await page.locator('button[data-action="transfer"]').first().click();
  const transferModal = page.locator('div[role="dialog"]');
  await expect(transferModal).toBeVisible();
  await expect(transferModal.locator('h3:has-text("Demirbaş Konum / Oda Transferi")')).toBeVisible();
  await page.waitForTimeout(500);

  const file4 = '12-r3a-asset-transfer-modal.png';
  await page.screenshot({ path: path.join(screenshotsDir, file4) });
  copyToArtifacts(file4);

  // Close transfer modal
  await page.keyboard.press('Escape');
  await expect(transferModal).not.toBeVisible();

  // 5. Asset Lifecycle Modal
  await page.locator('button[data-action="lifecycle"]').first().click();
  const lifecycleModal = page.locator('div[role="dialog"]');
  await expect(lifecycleModal).toBeVisible();
  await expect(lifecycleModal.locator('h3:has-text("Yaşam Döngüsü Durum Geçişi")')).toBeVisible();
  await page.waitForTimeout(500);

  const file5 = '13-r3a-asset-lifecycle-modal.png';
  await page.screenshot({ path: path.join(screenshotsDir, file5) });
  copyToArtifacts(file5);

  // Close lifecycle modal
  await page.keyboard.press('Escape');
  await expect(lifecycleModal).not.toBeVisible();
});
