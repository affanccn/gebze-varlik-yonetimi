import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'child_process';

const ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || 'GebzeDev2026!';
const DEV_PASSWORD = process.env.APP_DEV_PASSWORD || 'GebzeDev2026!';

test.describe('Faz R4: Yönetim, Denetim ve Kalan Modüller E2E Test Paketi', () => {
  // Ortak giriş fonksiyonu
  async function loginAs(page: Page, username = 'admin', password = ADMIN_PASSWORD) {
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

  test('1. Kullanıcı Yönetimi: KPI Kartları, TanStack Table, Filtreler ve Kolonlar', async ({ page }) => {
    await loginAs(page);
    await page.goto('/users');

    // Başlık ve Açıklama
    await expect(page.locator('h1:has-text("Kullanıcı Hesap Yönetimi")')).toBeVisible();

    // KPI Kartları
    await expect(page.locator('text=Toplam Hesap')).toBeVisible();
    await expect(page.locator('text=Aktif Kullanıcı')).toBeVisible();
    await expect(page.locator('text=Pasif Hesap')).toBeVisible();
    await expect(page.locator('text=Kilitli Hesap')).toBeVisible();

    // Tablo Kolon Başlıkları
    await expect(page.locator('th:has-text("Kullanıcı Adı")')).toBeVisible();
    await expect(page.locator('th:has-text("Adı Soyadı")')).toBeVisible();
    await expect(page.locator('th:has-text("Rol")')).toBeVisible();
    await expect(page.locator('th:has-text("Müdürlük")')).toBeVisible();
    await expect(page.locator('th:has-text("Durum")')).toBeVisible();
    await expect(page.locator('th:has-text("Eylemler")')).toBeVisible();

    // Filtreler
    await expect(page.locator('#user-search')).toBeVisible();
    await expect(page.locator('#user-filter-role')).toBeVisible();
    await expect(page.locator('button:has-text("Aktifler")')).toBeVisible();
    await expect(page.locator('button:has-text("Tümü")')).toBeVisible();

    // Tabloda en az 1 admin kullanıcısı listelenmeli
    await expect(page.locator('table tbody tr:has-text("admin")')).toBeVisible();
  });

  test('2. Kullanıcı CRUD: Yeni Kullanıcı Tanımlama, Geçici Şifre ve Şifre Sıfırlama', async ({ page }) => {
    await loginAs(page);
    await page.goto('/users');

    // Yeni Kullanıcı Ekle modalını aç
    const addBtn = page.locator('#btn-open-user-form');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Modal kontrolü
    await expect(page.locator('h3:has-text("Yeni Kullanıcı Hesabı Tanımla")')).toBeVisible();

    // Formu doldur
    const testUsername = `e2e_user_${Date.now().toString().slice(-4)}`;
    await page.locator('#user-username-input').fill(testUsername);
    await page.locator('#user-fullname-input').fill('E2E Test Personeli');
    await page.locator('#user-email-input').fill(`${testUsername}@gebze.bel.tr`);

    // Rol seçimi: VIEWER (müdürlük zorunlu değil)
    await page.locator('#user-role-select').selectOption('VIEWER');

    // Kaydet butonuna tıkla
    await page.locator('#btn-save-user').click();

    // Geçici şifre başarı ekranı gelmeli
    await expect(page.locator('h3:has-text("Kullanıcı Oluşturuldu")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Geçici Sistem Şifresi')).toBeVisible();

    // Modalı kapat
    await page.locator('button:has-text("Şifreyi Kopyaladım, Kapat")').click();

    // Tabloda yeni kullanıcının varlığını ara
    await page.locator('#user-search').fill(testUsername);
    await expect(page.locator(`table tbody tr:has-text("${testUsername}")`)).toBeVisible({ timeout: 5000 });

    // Şifre Sıfırlama Akışı
    const resetBtn = page.locator(`button[data-reset-user-id]`).first();
    await resetBtn.click();

    // Şifre sıfırlama onay modalı gelmeli
    await expect(page.locator('h3:has-text("Kullanıcı Şifresi Sıfırlama")')).toBeVisible();
    await page.locator('#btn-confirm-reset-pwd').click();

    // Yeni Geçici Şifre Üretildi ekranı
    await expect(page.locator('text=Yeni Geçici Şifre Üretildi')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Kapat")').click();
  });

  test('3. Araç ve Filo Yönetimi: KPI Kartları, Araç Tablosu ve Durum/KM Güncelleme', async ({ page }) => {
    await loginAs(page);
    await page.goto('/fleet');

    // Başlık
    await expect(page.locator('h1:has-text("Araç & Filo")')).toBeVisible();

    // KPI'lar
    await expect(page.locator('text=Toplam Filo').first()).toBeVisible();
    await expect(page.locator('text=Görevde (Sahada)').first()).toBeVisible();
    await expect(page.locator('text=Garajda (Beklemede)').first()).toBeVisible();
    await expect(page.locator('text=Bakım & Arızada').first()).toBeVisible();

    // Tablo Kolonları
    await expect(page.locator('th:has-text("Plaka / Kod")')).toBeVisible();
    await expect(page.locator('th:has-text("Araç Türü")')).toBeVisible();
    await expect(page.locator('th:has-text("Marka / Model & Yıl")')).toBeVisible();
    await expect(page.locator('th:has-text("Zimmetli Şoför")')).toBeVisible();
    await expect(page.locator('th:has-text("Güncel KM")')).toBeVisible();
    await expect(page.locator('th:has-text("Bağlı Müdürlük")')).toBeVisible();
    await expect(page.locator('th:has-text("Durum")')).toBeVisible();
    await expect(page.locator('th:has-text("Eylemler")')).toBeVisible();

    // İlk araç için Durum Güncelle butonuna tıkla
    const editBtn = page.locator('button[data-update-fleet-id]').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Modal açıldı mı
    await expect(page.locator('h3:has-text("Araç / İş Makinesi Durum Güncelleme")')).toBeVisible();
    await expect(page.locator('#fleet-status-select')).toBeVisible();
    await expect(page.locator('#fleet-km-input')).toBeVisible();

    // Modalı kapat
    await page.locator('button:has-text("Vazgeç")').click();
    await expect(page.locator('h3:has-text("Araç / İş Makinesi Durum Güncelleme")')).not.toBeVisible();
  });

  test('4. Satın Alma ve Tedarik Süreçleri: KPI Kartları, Sipariş Tablosu ve Filtreler', async ({ page }) => {
    await loginAs(page);
    await page.goto('/procurement');

    // Başlık
    await expect(page.locator('h1:has-text("Satın Alma & Tedarik")')).toBeVisible();

    // KPI Kartları
    await expect(page.getByText('Toplam Tedarik', { exact: true })).toBeVisible();
    await expect(page.locator('text=Süreç Devam Eden')).toBeVisible();
    await expect(page.locator('.uppercase:has-text("Teslim Alınanlar")')).toBeVisible();
    await expect(page.locator('text=Toplam Tedarik Bütçesi')).toBeVisible();

    // Tablo Kolonları
    await expect(page.locator('th:has-text("Sipariş No")')).toBeVisible();
    await expect(page.locator('th:has-text("Talep / İhale Başlığı")')).toBeVisible();
    await expect(page.locator('th:has-text("Tedarik Türü")')).toBeVisible();
    await expect(page.locator('th:has-text("Tedarikçi Firma")')).toBeVisible();
    await expect(page.locator('th:has-text("Talep Eden Birim")')).toBeVisible();
    await expect(page.locator('th:has-text("Tutar / Bütçe")')).toBeVisible();
    await expect(page.locator('th:has-text("Durum")')).toBeVisible();
    await expect(page.locator('th:has-text("Tarih")')).toBeVisible();

    // Filtre kutuları
    await expect(page.locator('#procurement-search')).toBeVisible();
    await expect(page.locator('button:has-text("Teslim Alınanlar")')).toBeVisible();
  });

  test('5. Sayım ve Envanter Kontrolü: Seans Seçici, Okutma Listesi ve QR Okutma Modalı', async ({ page }) => {
    await loginAs(page);
    await page.goto('/counting');

    // Başlık
    await expect(page.locator('h1:has-text("Fiziksel Sayım")')).toBeVisible();

    // Seans seçici kartları
    const sessionCard = page.locator('.audit-session-card').first();
    await expect(sessionCard).toBeVisible();

    // KPI göstergeleri
    await expect(page.getByText('Beklenen', { exact: true })).toBeVisible();
    await expect(page.getByText('Taranan', { exact: true })).toBeVisible();
    await expect(page.locator('text=Eksik / Kayıp')).toBeVisible();
    await expect(page.locator('text=Fazla / Tanımsız')).toBeVisible();

    // Barkod / QR Okut butonuna tıkla
    const scanBtn = page.locator('#btn-open-audit-scan');
    await expect(scanBtn).toBeVisible();
    await scanBtn.click();

    // Modal açılmalı
    await expect(page.locator('h3:has-text("Barkod / QR Sayım Okutma")')).toBeVisible();
    await expect(page.locator('#audit-scan-code-input')).toBeVisible();
    await expect(page.locator('#audit-scan-location-input')).toBeVisible();

    // Modalı kapat
    await page.locator('button:has-text("Vazgeç")').click();
    await expect(page.locator('h3:has-text("Barkod / QR Sayım Okutma")')).not.toBeVisible();
  });

  test('6. Sistem Denetim Günlüğü: Güvenlik KPI, Filtreler ve Audit Log Listesi', async ({ page }) => {
    await loginAs(page);
    await page.goto('/audit');

    // Başlık
    await expect(page.locator('h1:has-text("Sistem Denetim ve Güvenlik")')).toBeVisible();

    // Bilgi Şeridi & Kayıt Özeti
    await expect(page.locator('text=güvenlik ve sistem denetim olayı listelenmektedir')).toBeVisible();
    await expect(page.locator('text=Filtrelenen Olay')).toBeVisible();

    // Arama & Filtre
    await expect(page.locator('#audit-search')).toBeVisible();
    await expect(page.locator('#audit-action-filter')).toBeVisible();

    // Tablo Kolonları
    await expect(page.locator('th:has-text("Zaman")')).toBeVisible();
    await expect(page.locator('th:has-text("Eylem Türü")')).toBeVisible();
    await expect(page.locator('th:has-text("Kullanıcı (Aktör)")')).toBeVisible();
    await expect(page.locator('th:has-text("İstemci IP")')).toBeVisible();
    await expect(page.locator('th:has-text("Varlık / Modül")')).toBeVisible();
    await expect(page.locator('th:has-text("Açıklama & Detay")')).toBeVisible();
  });

  test('7. Sistem Ayarları ve Yetki Matrisi: Parametre Düzenleme ve RBAC Matrisi', async ({ page }) => {
    await loginAs(page);
    await page.goto('/settings');

    // Başlık
    await expect(page.locator('h1:has-text("Sistem Ayarları & Kurumsal Yetki Matrisi")')).toBeVisible();

    // İki ana bölüm ve Salt Okunur Güvenlik Uyarısı
    await expect(page.locator('text=Sistem ve İşletim Parametreleri')).toBeVisible();
    await expect(page.locator('text=Salt Okunur (Sunucu Yapılandırmasından Gelir)')).toBeVisible();
    await expect(page.locator('text=Kurumsal Rol Yetki Matrisi (RBAC Güvenlik Tablosu)')).toBeVisible();

    // RBAC Tablo Kolonları
    await expect(page.locator('th:has-text("Modül / İşlem")')).toBeVisible();
    await expect(page.locator('th:has-text("ADMIN")')).toBeVisible();
    await expect(page.locator('th:has-text("DEPT_MANAGER")')).toBeVisible();
    await expect(page.locator('th:has-text("STAFF")')).toBeVisible();
    await expect(page.locator('th:has-text("AUDITOR")')).toBeVisible();
    await expect(page.locator('th:has-text("VIEWER")')).toBeVisible();
  });

  test('8. Rol Bazlı Erişim Kısıtlamaları: STAFF ve AUDITOR Güvenlik Kontrolleri', async ({ page }) => {
    // 1. STAFF kullanıcısıyla giriş yap
    await loginAs(page, 'saha_personel', DEV_PASSWORD);

    // STAFF /users rotasına erişememeli -> Dashboard'a yönlendirilmeli
    await page.goto('/users');
    await expect(page).toHaveURL(/.*dashboard/);

    // STAFF /audit rotasına erişememeli
    await page.goto('/audit');
    await expect(page).toHaveURL(/.*dashboard/);

    // STAFF /fleet rotasına erişememeli
    await page.goto('/fleet');
    await expect(page).toHaveURL(/.*dashboard/);

    // Çıkış yap
    await page.locator('button[title="Güvenli Çıkış"]').click();
    await page.waitForURL('**/login');

    // 2. AUDITOR kullanıcısıyla giriş yap
    await loginAs(page, 'ic_denetci', DEV_PASSWORD);

    // AUDITOR /audit rotasına erişebilmeli
    await page.goto('/audit');
    await expect(page.locator('h1:has-text("Sistem Denetim ve Güvenlik")')).toBeVisible();

    // Ancak AUDITOR /users rotasına erişememeli
    await page.goto('/users');
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
