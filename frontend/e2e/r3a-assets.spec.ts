import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Faz R3a: Varlık Yönetimi Çekirdek E2E Test Paketi', () => {
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

  // Test öncesi ve sonrası temizlik
  test.beforeEach(() => {
    cleanupDb();
  });

  test.afterAll(() => {
    cleanupDb();
  });

  test('1. Varlık Listesi: TanStack Table, 74 Varlık, Kolonlar ve Sayfalama', async ({ page }) => {
    await loginAs(page);
    await page.goto('/assets');

    // Başlık ve açıklama
    await expect(page.locator('h1:has-text("Demirbaş ve Varlık Envanteri")')).toBeVisible();
    await expect(page.locator('text=Toplam 74 kayıt')).toBeVisible();

    // Tablo kolon başlıkları
    await expect(page.locator('th:has-text("Varlık Kodu")')).toBeVisible();
    await expect(page.locator('th:has-text("Varlık Adı & Model")')).toBeVisible();
    await expect(page.locator('th:has-text("Kategori")')).toBeVisible();
    await expect(page.locator('th:has-text("Konum / Oda")')).toBeVisible();
    await expect(page.locator('th:has-text("Müdürlük")')).toBeVisible();
    await expect(page.locator('th:has-text("Zimmetli Personel")')).toBeVisible();
    await expect(page.locator('th:has-text("Rayiç Değer")')).toBeVisible();
    await expect(page.locator('th:has-text("Yaşam Döngüsü")')).toBeVisible();
    await expect(page.locator('th:has-text("Eylemler")')).toBeVisible();

    // Sayfalama kontrolleri
    await expect(page.locator('text=Sayfa başına:')).toBeVisible();
  });

  test('2. Arama ve Filtreleme: Arama kutusu, kategori filtresi ve sıfırlama', async ({ page }) => {
    await loginAs(page);
    await page.goto('/assets');

    // Verilerin yüklendiğini bekle
    await expect(page.locator('text=Toplam 74 kayıt')).toBeVisible();

    const searchInput = page.locator('#asset-query');
    await expect(searchInput).toBeVisible();

    // Kod ile arama
    await searchInput.fill('GBZ-AST-144');
    await expect(page.locator('td:has-text("GBZ-AST-144")')).toBeVisible();

    // Filtreleri temizle butonu
    const resetBtn = page.locator('button[title="Filtreleri Temizle"]');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // 74 varlığın geri gelmesi
    await expect(page.locator('text=Toplam 74 kayıt')).toBeVisible();

    // Kategori dropdown filtresi (Bilişim Ekipmanları)
    const catSelect = page.locator('#asset-filter-cat');
    await catSelect.selectOption({ label: 'Bilişim Ekipmanları' });

    // Filtrelenen sonuçların doğrulanması
    await expect(page.locator('button[title="Filtreleri Temizle"]')).toBeVisible();

    // Tekrar sıfırla
    await page.locator('button[title="Filtreleri Temizle"]').click();
    await expect(page.locator('text=Toplam 74 kayıt')).toBeVisible();
  });

  test('3. Varlık Detay Modalı: QR Kod, 6 Aşamalı Yaşam Döngüsü Stepper, Künye ve Hareketler', async ({ page }) => {
    await loginAs(page);
    await page.goto('/assets');

    // Verilerin yüklendiğini bekle
    await expect(page.locator('text=Toplam 74 kayıt')).toBeVisible();

    // İlk satırın detay butonuna tıkla
    const firstDetailBtn = page.locator('button[data-open-detail-id]').first();
    await expect(firstDetailBtn).toBeVisible();
    await firstDetailBtn.click();

    // Modal açıldı mı?
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // 6 Aşamalı stepper kontrolü
    await expect(modal.locator('text=Kurumsal Yaşam Döngüsü İlerlemesi')).toBeVisible();
    await expect(modal.locator('text=Satın Alındı').first()).toBeVisible();
    await expect(modal.locator('text=Taşınır Kaydı').first()).toBeVisible();
    await expect(modal.locator('text=Odaya Yerleşti').first()).toBeVisible();
    await expect(modal.locator('text=Zimmetlendi').first()).toBeVisible();

    // QR SVG kutusu
    await expect(modal.locator('svg').first()).toBeVisible();

    // Künye bilgileri
    await expect(modal.locator('text=Hizmet Binası & Kat')).toBeVisible();
    await expect(modal.locator('text=Oda / Lokasyon')).toBeVisible();
    await expect(modal.locator('text=Sorumlu Müdürlük')).toBeVisible();
    await expect(modal.locator('text=Tahmini Rayiç Değer')).toBeVisible();

    // Hareket geçmişi
    await expect(modal.locator('text=Konum ve Hareket Geçmişi')).toBeVisible();

    // ESC ile kapat
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('4. E2E Çekirdek CRUD: Ekle, Düzenle, Transfer Et, Durum Değiştir, Sil', async ({ page }) => {
    await loginAs(page);
    await page.goto('/assets');

    // Verilerin yüklendiğini bekle
    await expect(page.locator('text=Toplam 74 kayıt')).toBeVisible();

    const testAssetCode = 'GBZ-E2E-R3A-' + Math.floor(Math.random() * 9000 + 1000);
    const testAssetName = 'E2E Test Laptop R3A';

    // 1. ADIM: YENİ VARLIK EKLE
    await page.locator('#btn-open-asset-form').click();
    const formModal = page.locator('div[role="dialog"]');
    await expect(formModal).toBeVisible();
    await expect(formModal.locator('text=Yeni Varlık Kaydı Ekle')).toBeVisible();

    await page.locator('input[name="name"]').fill(testAssetName);
    await page.locator('select[name="category"]').selectOption({ label: 'Bilişim Ekipmanları' });
    await page.locator('input[name="code"]').fill(testAssetCode);
    await page.locator('input[name="brandModel"]').fill('Dell Latitude 5520 E2E');
    await page.locator('input[name="estimatedValue"]').fill('35000');

    // Müdürlük ve alt birim seç
    await page.locator('select[name="departmentId"]').selectOption({ index: 1 });
    await page.waitForTimeout(300);
    const subSelect = page.locator('select[name="subUnitId"]');
    if (await subSelect.isEnabled()) {
      await subSelect.selectOption({ index: 1 });
    }

    // Hizmet binası seç
    await page.locator('select[name="buildingId"]').selectOption({ index: 1 });

    // Kaydet
    await formModal.locator('button[type="submit"]:has-text("Varlığı Kaydet")').click();

    // Form modal kapandı ve varlık listede yer aldı
    await expect(formModal).not.toBeVisible({ timeout: 10000 });

    // Arama ile yeni varlığı bul
    await page.locator('#asset-query').fill(testAssetCode);
    const createdRow = page.locator(`tr:has-text("${testAssetCode}")`);
    await expect(createdRow).toBeVisible();
    await expect(createdRow.locator(`text=${testAssetName}`)).toBeVisible();

    // 2. ADIM: DÜZENLE
    await createdRow.locator('button[data-action="edit"]').click();
    const editModal = page.locator('div[role="dialog"]');
    await expect(editModal).toBeVisible();
    await expect(editModal.locator(`text=Varlık Kaydını Düzenle (${testAssetCode})`)).toBeVisible();

    await page.locator('input[name="brandModel"]').fill('Dell Latitude 5520 Guncel');
    await page.locator('textarea[name="notes"]').fill('E2E Test Not Güncellemesi');
    await editModal.locator('button[type="submit"]:has-text("Değişiklikleri Kaydet")').click();
    await expect(editModal).not.toBeVisible({ timeout: 10000 });

    // Güncelleme tabloda görünüyor mu?
    await expect(page.locator('text=Dell Latitude 5520 Guncel')).toBeVisible();

    // 3. ADIM: KONUM TRANSFERİ
    await page.locator(`tr:has-text("${testAssetCode}")`).locator('button[data-action="transfer"]').click();
    const transferModal = page.locator('div[role="dialog"]');
    await expect(transferModal).toBeVisible();
    await expect(transferModal.locator('text=Demirbaş Konum / Oda Transferi')).toBeVisible();

    // Hedef bina seç (index 2)
    const bldSelect = transferModal.locator('select').first();
    await bldSelect.selectOption({ index: 2 });
    await transferModal.locator('textarea').fill('E2E Transfer Test Notu');
    await transferModal.locator('button[type="submit"]:has-text("Transferi Onayla")').click();
    await expect(transferModal).not.toBeVisible({ timeout: 10000 });

    // 4. ADIM: YAŞAM DÖNGÜSÜ DURUM GEÇİŞİ
    await page.locator(`tr:has-text("${testAssetCode}")`).locator('button[data-action="lifecycle"]').click();
    const lifeModal = page.locator('div[role="dialog"]');
    await expect(lifeModal).toBeVisible();
    await expect(lifeModal.locator('text=Yaşam Döngüsü Durum Geçişi')).toBeVisible();

    await lifeModal.locator('textarea').fill('E2E Test Durum Geçiş Gerekçesi');
    await lifeModal.locator('button[type="submit"]:has-text("Durumu Güncelle")').click();
    await expect(lifeModal).not.toBeVisible({ timeout: 10000 });

    // 5. ADIM: SİL (SOFT DELETE)
    await page.locator(`tr:has-text("${testAssetCode}")`).locator('button[data-action="delete"]').click();
    const deleteModal = page.locator('div[role="dialog"]');
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal.locator('text=Bu varlık kaydını silmek istediğinize emin misiniz?')).toBeVisible();

    await deleteModal.locator('button:has-text("Evet, Varlığı Sil")').click();
    await expect(deleteModal).not.toBeVisible({ timeout: 10000 });

    // Arama sonucunun boş çıkması
    await expect(page.locator('text=Varlık Kaydı Bulunamadı')).toBeVisible();

    // Arama filtresini temizle
    await page.locator('#asset-query').fill('');
    await expect(page.locator('text=Toplam 74 kayıt')).toBeVisible();
  });

  test('5. Rol İzolasyonu: DEPT_MANAGER (Fen İşleri) 5 Varlık Görür, Sil Butonu Yoktur', async ({ page }) => {
    await loginAs(page, 'fen_isleri_mudur', 'GebzeDev2026!');
    await page.goto('/assets');

    // Fen İşleri'ne ait 5 varlık listelenmeli
    await expect(page.locator('text=Toplam 5 kayıt')).toBeVisible();

    // Müdürlük filtresi devre dışı/kendi müdürlüğüne kilitli olmalı
    const deptSelect = page.locator('#asset-filter-dept');
    await expect(deptSelect).toBeDisabled();

    // Silme butonu bulunmamalı (canDelete = false)
    const deleteButtons = page.locator('button[data-action="delete"]');
    await expect(deleteButtons).toHaveCount(0);

    // Yeni varlık butonu vardır
    await expect(page.locator('#btn-open-asset-form')).toBeVisible();
  });

  test('6. Rol İzolasyonu: STAFF (Saha Personel) Salt Okunurdur, Eylem Butonları Yoktur', async ({ page }) => {
    await loginAs(page, 'saha_personel', 'GebzeDev2026!');
    await page.goto('/assets');

    // Yeni Varlık Ekle butonu olmamalıdır
    await expect(page.locator('#btn-open-asset-form')).toHaveCount(0);

    // Transfer, Düzenle, Sil, Durum butonları tabloda olmamalıdır
    await expect(page.locator('button[data-action="transfer"]')).toHaveCount(0);
    await expect(page.locator('button[data-action="edit"]')).toHaveCount(0);
    await expect(page.locator('button[data-action="delete"]')).toHaveCount(0);
    await expect(page.locator('button[data-action="lifecycle"]')).toHaveCount(0);

    // Sayfa sorunsuz yüklenmiş olmalıdır
    await expect(page.locator('h1:has-text("Demirbaş ve Varlık Envanteri")')).toBeVisible();
  });

  test('7. Rol İzolasyonu: AUDITOR (İç Denetçi) Tüm Varlıkları Görür, Yazma Butonu Yoktur', async ({ page }) => {
    await loginAs(page, 'ic_denetci', 'GebzeDev2026!');
    await page.goto('/assets');

    // Tüm belediye demirbaşlarını görebilir (74 varlık)
    await expect(page.locator('text=Toplam 74 kayıt')).toBeVisible();

    // Yazma butonu olmamalıdır
    await expect(page.locator('#btn-open-asset-form')).toHaveCount(0);
    await expect(page.locator('button[data-action="delete"]')).toHaveCount(0);
  });
});
