import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || 'YeniGucluAdmin2026!';
const DEV_PASSWORD = process.env.APP_DEV_PASSWORD || 'GebzeDev2026!';

function runSql(sql: string) {
  try {
    return execSync('docker exec -i gebze-varlik-oracle23ai sqlplus -s varlik_app/GebzeVarlik2026@FREEPDB1', {
      input: sql.replace(/\r/g, '') + '\nexit;\n',
      encoding: 'utf8',
    });
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; message: string };
    return (err.stdout ? err.stdout.toString() : '') + ' ' + err.message;
  }
}

test.describe('Faz R1 Frontend Altyapı ve Güvenlik Duman Testleri', () => {
  const screenshotsDir = path.resolve('e2e-screenshots');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('1. Giriş Ekranı ve Hatalı Parola Kontrolü', async ({ page }) => {
    await page.goto('/login');

    // Başlık ve form alanlarını doğrula
    await expect(page.locator('h1')).toContainText('Varlık Yönetim Sistemi');
    await expect(page.locator('#login-username')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();

    // Giriş ekranı ekran görüntüsü
    await page.screenshot({ path: path.join(screenshotsDir, '01-login.png') });

    // Hatalı şifre dene
    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill('YanlisSifre123!');
    await page.locator('button[type="submit"]').click();

    // Hata mesajı görünmeli ve URL hala /login kalmalı
    const errorAlert = page.locator('div[role="alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Kalan deneme hakkınız');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('2. ADMIN Girişi, Menü Öğeleri ve Güvenli Çıkış (CSRF Dahil)', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard');
    await expect(page.locator('h2')).toContainText('Ana Ekran & Dashboard');

    // ADMIN rol rozetini doğrula
    await expect(page.locator('text=Sistem Yöneticisi').first()).toBeVisible();
    await expect(page.locator('text=ADMIN').first()).toBeVisible();

    // Menü öğelerini doğrula: ADMIN için "Kullanıcılar" ve "Denetim & Onay" görünür olmalı
    await expect(page.locator('nav >> text=Kullanıcılar')).toBeVisible();
    await expect(page.locator('nav >> text=Denetim & Onay')).toBeVisible();
    await expect(page.locator('nav >> text=Varlıklar')).toBeVisible();

    // Masaüstü dashboard ekran görüntüsü
    await page.screenshot({ path: path.join(screenshotsDir, '02-dashboard.png') });

    // Çıkış yap (CSRF korumalı)
    await page.locator('button:has-text("Çıkış")').click();
    await page.waitForURL('**/login');
    await expect(page.locator('#login-username')).toBeVisible();
  });

  test('3. Fen İşleri Müdürü (DEPT_MANAGER) Girişi ve Menü Kısıtları', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-username').fill('fen_isleri_mudur');
    await page.locator('#login-password').fill(DEV_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=DEPT_MANAGER')).toBeVisible();

    // DEPT_MANAGER için Kullanıcılar ve Denetim & Onay GİZLİ olmalıdır
    await expect(page.locator('nav >> text=Kullanıcılar')).not.toBeVisible();
    await expect(page.locator('nav >> text=Denetim & Onay')).not.toBeVisible();

    // Varlıklar ve Zimmet açık olmalı
    await expect(page.locator('nav >> text=Varlıklar')).toBeVisible();
    await expect(page.locator('nav >> text=Zimmet')).toBeVisible();

    await page.locator('button:has-text("Çıkış")').click();
    await page.waitForURL('**/login');
  });

  test('4. Saha Personeli (STAFF) Menü Kısıtları ve URL Rota Koruması', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-username').fill('saha_personel');
    await page.locator('#login-password').fill(DEV_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=STAFF')).toBeVisible();

    // STAFF için gizli olması gereken menülerin kontrolü
    await expect(page.locator('nav >> text=Kurumsal & Fiziksel Ağaç')).not.toBeVisible();
    await expect(page.locator('nav >> text=Bakım & Onarım')).not.toBeVisible();
    await expect(page.locator('nav >> text=Depo & Stok')).not.toBeVisible();
    await expect(page.locator('nav >> text=Araç & Filo')).not.toBeVisible();
    await expect(page.locator('nav >> text=Satın Alma & Tedarik')).not.toBeVisible();
    await expect(page.locator('nav >> text=Sayım & Kontrol')).not.toBeVisible();
    await expect(page.locator('nav >> text=Raporlama & Analiz')).not.toBeVisible();
    await expect(page.locator('nav >> text=Denetim & Onay')).not.toBeVisible();
    await expect(page.locator('nav >> text=Kullanıcılar')).not.toBeVisible();

    // İzinli menüler
    await expect(page.locator('nav >> text=Ana Ekran')).toBeVisible();
    await expect(page.locator('nav >> text=Personel Yönetimi')).toBeVisible();
    await expect(page.locator('nav >> text=Varlıklar')).toBeVisible();
    await expect(page.locator('nav >> text=Zimmet')).toBeVisible();

    // Doğrudan URL ile yasaklı rotaya erişim testi: /users
    await page.goto('/users');
    await page.waitForURL('**/dashboard');
    const toast = page.locator('div[role="alert"]:has-text("Bu sayfaya erişim yetkiniz bulunmamaktadır")').first();
    await expect(toast).toBeVisible();

    // Doğrudan URL ile yasaklı rotaya erişim testi: /audit
    await page.goto('/audit');
    await page.waitForURL('**/dashboard');

    await page.locator('button:has-text("Çıkış")').click();
    await page.waitForURL('**/login');
  });

  test('5. AUDITOR ve VIEWER Rolleri Menü Görünürlüğü', async ({ page }) => {
    // 5.1 AUDITOR
    await page.goto('/login');
    await page.locator('#login-username').fill('ic_denetci');
    await page.locator('#login-password').fill(DEV_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=AUDITOR')).toBeVisible();
    await expect(page.locator('nav >> text=Denetim & Onay')).toBeVisible();
    await expect(page.locator('nav >> text=Kullanıcılar')).not.toBeVisible();
    await page.locator('button:has-text("Çıkış")').click();

    // 5.2 VIEWER
    await page.goto('/login');
    await page.locator('#login-username').fill('kurum_izleyici');
    await page.locator('#login-password').fill(DEV_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=VIEWER')).toBeVisible();
    await expect(page.locator('nav >> text=Kullanıcılar')).not.toBeVisible();
    await expect(page.locator('nav >> text=Denetim & Onay')).not.toBeVisible();
    await page.locator('button:has-text("Çıkış")').click();
  });

  test('6. Oturum Süresi Dolması / Çerez Silinmesi Durumunda Mesajlı Yönlendirme', async ({ page, context }) => {
    await page.goto('/login');
    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');

    // Oturum çerezlerini temizle (30 dk zaman aşımı simülasyonu)
    await context.clearCookies();

    // Herhangi bir sayfaya tıkla / git
    await page.goto('/departments');

    // 401 alınacağı için oturum süresi doldu mesajıyla /login sayfasına dönmeli
    await page.waitForURL('**/login');
    const expiredAlert = page.locator('text=Oturum süreniz doldu').first();
    await expect(expiredAlert).toBeVisible();
  });

  test('7. Zorunlu Şifre Değiştirme (must_change_password=1) Akışı', async ({ page }) => {
    const tempUser = 'test_must_pwd_' + Date.now();
    const newPass = 'YeniGucluPass!2026';

    // BCrypt hash üretmek veya seeder şifresiyle test kullanıcısı açmak
    runSql("DELETE FROM system_users WHERE username LIKE 'test_must_pwd_%';\nCOMMIT;\n");
    runSql(`
      INSERT INTO system_users (id, username, password_hash, full_name, email, role, must_change_password, is_active, created_at)
      VALUES (
        (SELECT NVL(MAX(id), 0) + 1 FROM system_users),
        '${tempUser}',
        (SELECT password_hash FROM system_users WHERE username = 'kurum_izleyici'),
        'Zorunlu Test Kullanıcısı',
        'temp@gebze.bel.tr',
        'VIEWER',
        1,
        1,
        SYSTIMESTAMP
      );
      COMMIT;
    `);

    try {
      await page.goto('/login');
      await page.locator('#login-username').fill(tempUser);
      await page.locator('#login-password').fill(DEV_PASSWORD); // kurum_izleyici ile aynı hash
      await page.locator('button[type="submit"]').click();

      // Zorunlu şifre modalı anında belirmeli
      const modal = page.locator('div[role="dialog"]:has-text("Zorunlu Şifre Güncelleme")');
      await expect(modal).toBeVisible();

      // Kapatma butonu OLMAMALI (kapatılamayan modal)
      await expect(modal.locator('button[aria-label="Kapat"]')).not.toBeVisible();

      // Yeni şifre formunu doldur
      await modal.locator('#current-pwd').fill(DEV_PASSWORD);
      await modal.locator('#new-pwd').fill(newPass);
      await modal.locator('#confirm-pwd').fill(newPass);
      await modal.locator('button[type="submit"]').click();

      // Başarılı toast bildirimi gelmeli ve modal kaybolmalı
      const successToast = page.locator('div[role="alert"]:has-text("başarıyla güncellendi")');
      await expect(successToast).toBeVisible({ timeout: 10000 });
      await expect(modal).not.toBeVisible();

      // Kullanıcı dashboard'da olmalı
      await expect(page.locator('h2')).toContainText('Ana Ekran & Dashboard');
    } finally {
      runSql(`DELETE FROM system_users WHERE username = '${tempUser}';\nCOMMIT;\n`);
    }
  });

  test('8. Mobil Çekmece Görünümü ve Ekran Görüntüsü', async ({ page }) => {
    // Mobil görünüm boyutu ayarla
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');
    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard');

    // Hamburger menüyü aç
    const hamburgerBtn = page.locator('button[aria-label="Menüyü aç/kapat"]');
    await expect(hamburgerBtn).toBeVisible();
    await hamburgerBtn.click();

    // Sidebar çekmecesinin açıldığını doğrula
    await expect(page.locator('aside')).toHaveClass(/translate-x-0/);

    // Mobil çekmece ekran görüntüsü
    await page.screenshot({ path: path.join(screenshotsDir, '03-mobile-drawer.png') });

    // Bir menü öğesine tıklayınca çekmece otomatik kapanmalı
    await page.locator('aside >> text=Personel Yönetimi').click();
    await expect(page.locator('aside')).toHaveClass(/-translate-x-full/);
    await expect(page.locator('h2')).toContainText('Personel Yönetimi');
  });
});
