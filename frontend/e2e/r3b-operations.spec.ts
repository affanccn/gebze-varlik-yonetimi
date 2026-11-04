import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Faz R3b: Operasyonel Akışlar E2E Test Paketi', () => {
  // Ortak giriş fonksiyonu
  async function loginAs(page: Page, username = 'admin', password = 'YeniGucluAdmin2026!') {
    await page.goto('/login');
    await page.locator('#login-username').fill(username);
    await page.locator('#login-password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
  }

  function cleanupDb() {
    try {
      execSync('node ../scripts/cleanup_e2e.js', { stdio: 'ignore' });
    } catch {
      // ignore
    }
  }

  test.beforeEach(() => {
    cleanupDb();
  });

  test.afterAll(() => {
    cleanupDb();
  });

  test('1. Zimmet Listesi: KPI Kartları, TanStack Table, Filtreler ve Kolonlar', async ({ page }) => {
    await loginAs(page);
    await page.goto('/assignments');

    // Başlık ve açıklama
    await expect(page.locator('h1:has-text("Zimmet ve Taşınır Tahsis Yönetimi")')).toBeVisible();

    // KPI Kartları
    await expect(page.locator('text=Toplam Zimmet Fişi')).toBeVisible();
    await expect(page.locator('text=Aktif Zimmetli').first()).toBeVisible();
    await expect(page.locator('text=Ambara İade Edilen')).toBeVisible();

    // Tablo Kolonları
    await expect(page.locator('th:has-text("Belge No")')).toBeVisible();
    await expect(page.locator('th:has-text("Demirbaş")')).toBeVisible();
    await expect(page.locator('th:has-text("Zimmetli Personel")')).toBeVisible();
    await expect(page.locator('th:has-text("Müdürlük & Mahalli")')).toBeVisible();
    await expect(page.locator('th:has-text("Durum")')).toBeVisible();
    await expect(page.locator('th:has-text("Zimmet Tarihi")')).toBeVisible();
    await expect(page.locator('th:has-text("Eylemler")')).toBeVisible();

    // Arama kutusu ve durum filtreleri
    const searchInput = page.locator('#zimmet-search');
    await expect(searchInput).toBeVisible();
    await expect(page.locator('button:has-text("Aktifler")')).toBeVisible();
    await expect(page.locator('button:has-text("İade Edilenler")')).toBeVisible();
  });

  test('2. E2E Zimmet Akışı: Yeni Zimmet Fişi Kesme ve Ambara İade Alma', async ({ page }) => {
    await loginAs(page);

    // 1. Önce test için geçici bir varlık oluşturalım
    const testCode = `GBZ-E2E-R3B-ZMT-${Math.floor(Math.random() * 9000 + 1000)}`;
    await page.goto('/assets');
    await page.click('button:has-text("Yeni Varlık Ekle")');
    await page.fill('input[name="code"]', testCode);
    await page.fill('input[name="name"]', 'Zimmet Test Bilgisayarı');
    await page.selectOption('select[name="category"]', { label: 'Bilişim Ekipmanları' });
    await page.selectOption('select[name="departmentId"]', { index: 1 });
    await page.fill('input[name="estimatedValue"]', '25000');
    await page.click('button[type="submit"]:has-text("Kaydet")');
    await expect(page.locator(`text=${testCode}`).first()).toBeVisible({ timeout: 10000 });

    // 2. Zimmet sayfasına git
    await page.goto('/assignments');
    await page.click('button:has-text("Yeni Zimmet Fişi Düzenle")');

    // 3. Modal alanlarını doldur
    const formModal = page.locator('div[role="dialog"]');
    await expect(formModal).toBeVisible();
    await expect(formModal.locator('h3:has-text("Yeni Zimmet Fişi Düzenle")')).toBeVisible();

    // Varlık seç
    const assetOpt = formModal.locator(`#assign-asset-select option:has-text("${testCode}")`);
    await expect(assetOpt).toBeAttached();
    const assetVal = await assetOpt.getAttribute('value');
    await formModal.locator('#assign-asset-select').selectOption(assetVal!);

    // Personel seç
    await formModal.locator('#assign-person-select').selectOption({ index: 1 });
    // Kullanım mahalli ve not
    await formModal.locator('input[placeholder*="204"]').fill('Bilgi İşlem Sistem Odası');
    await formModal.locator('textarea').fill('E2E test zimmet tahsisi yapıldı.');

    // Gönder
    await formModal.locator('button:has-text("Zimmet Fişini Kes")').click();
    await expect(formModal).not.toBeVisible({ timeout: 10000 });

    // 4. Listede yeni zimmet fişini doğrula
    await page.fill('#zimmet-search', testCode);
    await expect(page.locator(`text=${testCode}`).first()).toBeVisible();
    await expect(page.locator('span:has-text("Aktif Zimmet")').first()).toBeVisible();

    // 5. Zimmet İade Alma
    const returnBtn = page.locator('button[title="Zimmeti İade Al"]').first();
    await expect(returnBtn).toBeVisible();
    await returnBtn.click();

    // İade modalı
    const returnModal = page.locator('div[role="dialog"]');
    await expect(returnModal).toBeVisible();
    await expect(returnModal.locator('h3:has-text("Zimmet İade Kabul İşlemi")')).toBeVisible();
    await returnModal.locator('button:has-text("Zimmeti İade Al")').click();
    await expect(returnModal).not.toBeVisible({ timeout: 10000 });

    // 6. İade durumunu doğrula
    await expect(page.locator('span:has-text("İade Alındı")').first()).toBeVisible();
  });

  test('3. Bakım & Onarım Yönetimi: KPI Kartları, Tablo ve E2E Bakım İş Emri Açma/Tamamlama', async ({ page }) => {
    await loginAs(page);

    // 1. Önce test için geçici bir varlık oluşturalım
    const testCode = `GBZ-E2E-R3B-MNT-${Math.floor(Math.random() * 9000 + 1000)}`;
    await page.goto('/assets');
    await page.click('button:has-text("Yeni Varlık Ekle")');
    await page.fill('input[name="code"]', testCode);
    await page.fill('input[name="name"]', 'Bakım Test Lazer Yazıcı');
    await page.selectOption('select[name="category"]', { label: 'Bilişim Ekipmanları' });
    await page.selectOption('select[name="departmentId"]', { index: 1 });
    await page.fill('input[name="estimatedValue"]', '18000');
    await page.click('button[type="submit"]:has-text("Kaydet")');
    await expect(page.locator(`text=${testCode}`).first()).toBeVisible({ timeout: 10000 });

    // 2. Bakım sayfasına git
    await page.goto('/maintenances');
    await expect(page.locator('h1:has-text("Bakım, Onarım ve Teknik Servis İş Emirleri")')).toBeVisible();

    // KPI Kartları
    await expect(page.locator('text=Toplam İş Emri')).toBeVisible();
    await expect(page.locator('text=Açık / Devam Eden').first()).toBeVisible();
    await expect(page.locator('text=Tamamlanan Bakımlar')).toBeVisible();
    await expect(page.locator('text=Toplam Harcama')).toBeVisible();

    // 3. Yeni Bakım Talebi Aç
    await page.click('button:has-text("Yeni Bakım Talebi Aç")');
    const formModal = page.locator('div[role="dialog"]');
    await expect(formModal).toBeVisible();

    // Varlık seç
    const assetOpt = formModal.locator(`#maint-asset-select option:has-text("${testCode}")`);
    await expect(assetOpt).toBeAttached();
    const assetVal = await assetOpt.getAttribute('value');
    await formModal.locator('#maint-asset-select').selectOption(assetVal!);

    await formModal.locator('#maint-priority-select').selectOption('ACIL');
    await formModal.locator('#maint-vendor-input').fill('Gebze Bilgi İşlem Teknik Servis');
    await formModal.locator('#maint-cost-input').fill('1750');
    await formModal.locator('#maint-desc-input').fill('Lazer tarama ünitesi arızası giderilecek.');

    await formModal.locator('button:has-text("İş Emrini Başlat")').click();
    await expect(formModal).not.toBeVisible({ timeout: 10000 });

    // 4. Listede açık bakım iş emrini doğrula
    await page.fill('#maint-search', testCode);
    await expect(page.locator(`text=${testCode}`).first()).toBeVisible();
    await expect(page.locator('span:has-text("Açık / Devam Ediyor")').first()).toBeVisible();

    // 5. Bakımı Tamamla
    const compBtn = page.locator('button[title="Bakımı Tamamla"]').first();
    await expect(compBtn).toBeVisible();
    await compBtn.click();

    // Tamamlama modalı
    const compModal = page.locator('div[role="dialog"]');
    await expect(compModal).toBeVisible();
    await expect(compModal.locator('h3:has-text("Bakım İş Emrini Kapat ve Onayla")')).toBeVisible();

    await compModal.locator('#maint-comp-resolution').fill('Lazer ünitesi değiştirildi, test baskıları alındı.');
    await compModal.locator('button:has-text("Bakımı Tamamla ve Kapat")').click();
    await expect(compModal).not.toBeVisible({ timeout: 10000 });

    // 6. Tamamlandı rozetini doğrula
    await expect(page.locator('span:has-text("Tamamlandı")').first()).toBeVisible();
  });

  test('4. Depo ve Stok Yönetimi: KPI Kartları, Envanter Listesi ve Stok Çıkış/Giriş Hareketi', async ({ page }) => {
    await loginAs(page);
    await page.goto('/stock');

    // Başlık ve KPI kartları
    await expect(page.locator('h1:has-text("Depo ve Sarf Malzeme Stok Yönetimi")')).toBeVisible();
    await expect(page.locator('text=Toplam Stok Kalemi')).toBeVisible();
    await expect(page.locator('text=Kritik & Tükenen').first()).toBeVisible();
    await expect(page.locator('text=Toplam Stok Değeri')).toBeVisible();
    await expect(page.locator('text=Aktif Ambar / Depo')).toBeVisible();

    // Sekmeler
    await expect(page.locator('button:has-text("Depo Stok Envanteri")')).toBeVisible();
    await expect(page.locator('button:has-text("Geçmiş Stok Hareketleri")')).toBeVisible();

    // Tablo satırlarından birinde "Hareket Yap" butonuna bas
    const firstTxBtn = page.locator('button:has-text("Hareket Yap")').first();
    await expect(firstTxBtn).toBeVisible();
    await firstTxBtn.click();

    // Stok Hareket Modalı
    const txModal = page.locator('div[role="dialog"]');
    await expect(txModal).toBeVisible();
    await expect(txModal.locator('h3:has-text("Stok Malzeme Hareketi (Giriş / Çıkış)")')).toBeVisible();

    // Giriş (İkmal) seç
    await txModal.locator('#stx-type-select').selectOption('GIRIS');
    await txModal.locator('#stx-qty-input').fill('5');
    await txModal.locator('#stx-notes-input').fill('E2E test kapsamında depoya ikmal yapıldı.');

    await txModal.locator('button:has-text("Depoya Giriş Yap")').click();
    await expect(txModal).not.toBeVisible({ timeout: 10000 });

    // Geçmiş Hareketler sekmesine geç ve doğrula
    await page.click('button:has-text("Geçmiş Stok Hareketleri")');
    await expect(page.locator('text=E2E test kapsamında depoya ikmal yapıldı.').first()).toBeVisible();
  });

  test('5. Excel ile Toplu İçe Aktarım Modalı: Şablon İndirme ve Önizleme Butonu', async ({ page }) => {
    await loginAs(page);
    await page.goto('/assets');

    // Excel ile Toplu Aktar butonu
    const importBtn = page.locator('#btn-open-bulk-import');
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Bulk Import Modalı
    const importModal = page.locator('div[role="dialog"]');
    await expect(importModal).toBeVisible();
    await expect(importModal.locator('h3:has-text("Excel ile Toplu Varlık İçe Aktarımı")')).toBeVisible();

    // Şablon indirme butonu kontrolü
    const downloadPromise = page.waitForEvent('download');
    await importModal.locator('#btn-download-import-template').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('gebze_varlik_ice_aktarim_sablonu.xlsx');

    // Modalı kapat
    await page.keyboard.press('Escape');
    await expect(importModal).not.toBeVisible();
  });

  test('6. Rol İzolasyonu: Saha Personeli (STAFF) Yetki Kısıtlamaları', async ({ page }) => {
    await loginAs(page, 'saha_personel', 'GebzeDev2026!');

    // 1. /assignments sayfasında yazma butonu OLMAMALI
    await page.goto('/assignments');
    await expect(page.locator('button:has-text("Yeni Zimmet Fişi Düzenle")')).not.toBeVisible();
    await expect(page.locator('button:has-text("İade Al")')).not.toBeVisible();

    // 2. /maintenances sayfasına gidememeli (Dashboard'a yönlendirilmeli)
    await page.goto('/maintenances');
    await expect(page).toHaveURL(/.*dashboard/);

    // 3. /stock sayfasına gidememeli (Dashboard'a yönlendirilmeli)
    await page.goto('/stock');
    await expect(page).toHaveURL(/.*dashboard/);

    // 4. /assets sayfasında "Excel ile Toplu Aktar" butonu OLMAMALI
    await page.goto('/assets');
    await expect(page.locator('#btn-open-bulk-import')).not.toBeVisible();
  });

  test('7. Rol İzolasyonu: İç Denetçi (AUDITOR) Salt Okunur Erişim', async ({ page }) => {
    await loginAs(page, 'ic_denetci', 'GebzeDev2026!');

    // 1. /assignments listesini görür ama fiş kesme butonu yoktur
    await page.goto('/assignments');
    await expect(page.locator('h1:has-text("Zimmet ve Taşınır Tahsis Yönetimi")')).toBeVisible();
    await expect(page.locator('button:has-text("Yeni Zimmet Fişi Düzenle")')).not.toBeVisible();

    // 2. /maintenances listesini görür ama iş emri açma butonu yoktur
    await page.goto('/maintenances');
    await expect(page.locator('h1:has-text("Bakım, Onarım ve Teknik Servis İş Emirleri")')).toBeVisible();
    await expect(page.locator('button:has-text("Yeni Bakım Talebi Aç")')).not.toBeVisible();

    // 3. /assets sayfasında "Excel ile Toplu Aktar" butonu OLMAMALI
    await page.goto('/assets');
    await expect(page.locator('#btn-open-bulk-import')).not.toBeVisible();
  });
});
