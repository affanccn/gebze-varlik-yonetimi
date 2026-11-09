import { test, expect, type Page } from '@playwright/test';

const ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || 'GebzeDev2026!';
const DEV_PASSWORD = process.env.APP_DEV_PASSWORD || 'GebzeDev2026!';

async function login(page: Page, username: string, pass: string) {
  await page.goto('/login');
  await page.locator('#login-username').fill(username);
  await page.locator('#login-password').fill(pass);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

test.describe('Faz R5: Üretim Dağıtımı ve SPA Doğrulama Testleri (Port 8080)', () => {

  test('1. SPA Doğrudan URL ve Sayfa Yenileme (F5) Testi', async ({ page }) => {
    // 1. Giriş yap
    await login(page, 'admin', ADMIN_PASSWORD);

    // Varlıklar ekranına git
    await page.goto('/assets');
    await expect(page.locator('h1')).toContainText('Demirbaş ve Varlık Envanteri');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    // F5 (Sayfa Yenileme) yap - Spring Boot SPA fallback index.html sunmalı
    await page.reload();
    await expect(page.locator('h1')).toContainText('Demirbaş ve Varlık Envanteri');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Kullanıcılar ekranına doğrudan URL ile git ve yenile
    await page.goto('/users');
    await expect(page.locator('h1')).toContainText('Kullanıcı Hesap Yönetimi');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
    await page.reload();
    await expect(page.locator('h1')).toContainText('Kullanıcı Hesap Yönetimi');

    // Zimmetler ekranı
    await page.goto('/assignments');
    await expect(page.locator('h1')).toContainText('Zimmet');
    await page.reload();
    await expect(page.locator('h1')).toContainText('Zimmet');

    // Raporlar ekranı
    await page.goto('/reports');
    await expect(page.locator('h1')).toContainText('Rapor');
    await page.reload();
    await expect(page.locator('h1')).toContainText('Rapor');

    // Ana Pano
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Yönetici Gösterge Paneli');
    await page.reload();
    await expect(page.locator('h1')).toContainText('Yönetici Gösterge Paneli');
  });

  test('2. Bilinmeyen SPA Rotasında 404 Sayfası ve Panoya Dönüş', async ({ page }) => {
    await login(page, 'admin', ADMIN_PASSWORD);

    // Bilinmeyen bir SPA rotasına git
    await page.goto('/olmayan-bir-sayfa-rotasi-xyz');

    // 404 bileşeni görünmeli
    await expect(page.locator('text=404 - SAYFA BULUNAMADI')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Aradığınız Sayfa Mevcut Değil')).toBeVisible();

    // Ana panoya dönüş butonuna tıkla
    await page.locator('button:has-text("Ana Panoya Git")').click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1')).toContainText('Yönetici Gösterge Paneli');
  });

  test('3. Bilinmeyen /api Uç Noktası JSON 404 Dönmeli (SPA HTML dönmemeli)', async ({ page }) => {
    await login(page, 'admin', ADMIN_PASSWORD);

    // Oturum açıkken bilinmeyen bir API yolunu fetch et
    const result = await page.evaluate(async () => {
      const resp = await fetch('/api/olmayan-bir-servis-rotasi');
      const json = await resp.json().catch(() => null);
      return {
        status: resp.status,
        contentType: resp.headers.get('content-type') || '',
        json,
      };
    });

    expect([403, 404]).toContain(result.status);
    expect(result.contentType).toContain('application/json');
    expect(result.json).not.toBeNull();
  });

  test('4. 5 Rol Giriş ve Yetki Sınırları Doğrulaması', async ({ page }) => {
    const roles = [
      { user: 'admin', pass: ADMIN_PASSWORD, expectedNav: 'Kullanıcılar' },
      { user: 'fen_isleri_mudur', pass: DEV_PASSWORD, expectedNav: 'Varlıklar' },
      { user: 'saha_personel', pass: DEV_PASSWORD, expectedNav: 'QR Kod & Etiketler' },
      { user: 'ic_denetci', pass: DEV_PASSWORD, expectedNav: 'Denetim & Onay' },
      { user: 'kurum_izleyici', pass: DEV_PASSWORD, expectedNav: 'Raporlama & Analiz' },
    ];

    for (const r of roles) {
      await page.goto('/login');
      await page.locator('#login-username').fill(r.user);
      await page.locator('#login-password').fill(r.pass);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // İlgili menü öğesi görünür olmalı
      await expect(page.locator(`nav >> text=${r.expectedNav}`).first()).toBeVisible();

      // Çıkış yap
      await page.locator('button:has-text("Çıkış")').click();
      await page.waitForURL('**/login', { timeout: 5000 });
    }
  });

  test('5. Yetkisiz Doğrudan URL Erişimi Koruması (DEPT_MANAGER -> /users)', async ({ page }) => {
    // Fen işleri müdürü ile giriş yap
    await login(page, 'fen_isleri_mudur', DEV_PASSWORD);

    // /users rotasına gitmeye çalış
    await page.goto('/users');

    // Koruma devreye girip panoya yönlendirmeli
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Yönetici Gösterge Paneli');
  });

  test('6. Hatalı Şifre ve Oturumu Kapatma (CSRF & Logout)', async ({ page }) => {
    await page.goto('/login');

    // Yanlış şifre denemesi
    await page.locator('#login-username').fill('admin');
    await page.locator('#login-password').fill('YanlisSifre123!');
    await page.locator('button[type="submit"]').click();

    // Hata mesajı alert olarak gösterilmeli ve yönlendirme yapılmamalı
    const alert = page.locator('div[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Kalan deneme hakkınız');
    await expect(page).toHaveURL(/.*\/login/);

    // Doğru şifreyle gir
    await page.locator('#login-password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Çıkış butonuna bas
    await page.locator('button:has-text("Çıkış")').click();
    await page.waitForURL('**/login', { timeout: 5000 });

    // Doğrudan panoya gitmeye çalış
    await page.goto('/dashboard');
    // Tekrar /login'e atmalı
    await page.waitForURL('**/login', { timeout: 5000 });
  });

  test('7. Güvenlik Başlıkları ve Sıfır CSP İhlali Doğrulaması', async ({ page }) => {
    const cspErrors: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Content Security Policy') || text.includes('violates the following Content Security Policy directive')) {
        cspErrors.push(text);
      }
    });

    const response = await page.goto('/login');
    const headers = response?.headers() || {};

    // Güvenlik başlıklarının doğrulanması
    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=(self)');

    // Giriş yap ve ana ekranları gezerek CSP ihlali olmadığını doğrula
    await login(page, 'admin', ADMIN_PASSWORD);

    const routesToCheck = [
      '/dashboard',
      '/assets',
      '/users',
      '/assignments',
      '/maintenances',
      '/stock',
      '/fleet',
      '/procurement',
      '/audits',
      '/reports',
      '/settings',
      '/documents',
      '/audit-logs'
    ];

    for (const route of routesToCheck) {
      await page.goto(route);
      await page.waitForSelector('table tbody tr, h1, div[role="alert"]', { timeout: 5000 });
    }

    // Konsolda tek bir CSP ihlali bile olmamalı
    expect(cspErrors).toEqual([]);
  });
});
