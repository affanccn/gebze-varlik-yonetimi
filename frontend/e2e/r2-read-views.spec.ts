import { test, expect, type Page } from '@playwright/test';

test.describe('Faz R2: 10 Temel Okuma Ekranı E2E Test Paketi', () => {
  // Ortak giriş fonksiyonu
  async function loginAs(page: Page, username = 'admin', password = 'YeniGucluAdmin2026!') {
    await page.goto('/login');
    await page.locator('#login-username').fill(username);
    await page.locator('#login-password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
  }

  test('1. Dashboard: KPI Kartları, Müdürlükler Tablosu, Arama ve Oda Modalı', async ({ page }) => {
    await loginAs(page);

    // KPI kartlarının doğrulanması
    await expect(page.locator('text=Yönetici Gösterge Paneli')).toBeVisible();
    await expect(page.locator('text=Toplam Varlık').first()).toBeVisible();
    await expect(page.locator('text=Aktif & Zimmetli').first()).toBeVisible();
    await expect(page.locator('text=Tahmini Envanter Değeri').first()).toBeVisible();

    // 30 Müdürlük tablosu ve arama kontrolü
    const searchInput = page.locator('input[placeholder="Müdürlük ara..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Fen İşleri');
    await expect(page.locator('td:has-text("Fen İşleri Müdürlüğü")')).toBeVisible();

    // Top rooms listesinden odaya tıklama ve modal doğrulaması
    const topRoomRow = page.locator('table tbody tr:has-text("Oda")').first();
    await expect(topRoomRow).toBeVisible();
    await topRoomRow.click();

    // Modal açıldı mı?
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Bu Odada Bulunan Demirbaşlar')).toBeVisible();

    // Modal kapatma
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('2. Kurumsal ve Fiziksel Ağaç (/tree): Düğüm Gezgini ve Mod Değişimi', async ({ page }) => {
    await loginAs(page);
    await page.goto('/tree');

    await expect(page.locator('h1:has-text("Kurumsal ve Fiziksel Hiyerarşi Ağacı")')).toBeVisible();

    // Fiziksel ağaç kök düğümü
    const rootNode = page.locator('text=Gebze Belediyesi Kurumsal Yerleşkeleri').first();
    await expect(rootNode).toBeVisible();

    // Bir düğüme tıklayıp sağ panel detayını görüntüleme
    await rootNode.click();
    await expect(page.locator('text=Hiyerarşik Tür:').first()).toBeVisible();

    // Kurumsal müdürlük ağacına geçiş
    await page.click('button:has-text("Kurumsal Müdürlük Ağacı")');
    await expect(page.locator('text=Gebze Belediyesi Müdürlükleri').first()).toBeVisible();
  });

  test('3. Binalar, Katlar ve Odalar (/locations): Bina Hapları, Filtreleme ve Oda Modalı', async ({ page }) => {
    await loginAs(page);
    await page.goto('/locations');

    await expect(page.locator('h1:has-text("Binalar, Katlar ve Odalar")')).toBeVisible();

    // Bina hapları listesi
    const anaBinaPill = page.locator('button:has-text("Ana Hizmet Binası")').first();
    await expect(anaBinaPill).toBeVisible();

    // Başka bir binaya geçiş (örn: Fen İşleri Garaj)
    const garajPill = page.locator('button:has-text("Fen İşleri Garaj")').first();
    if (await garajPill.isVisible()) {
      await garajPill.click();
      await expect(page.locator('h2:has-text("Fen İşleri Garaj")')).toBeVisible();
    }

    // Oda kartlarından birine tıklama
    const firstRoomCard = page.locator('div.cursor-pointer:has-text("Oda")').first();
    await expect(firstRoomCard).toBeVisible();
    await firstRoomCard.click();

    // Modal açılış kontrolü
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Bu Odada Bulunan Demirbaşlar')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('4. 30 Kurumsal Müdürlük (/departments): Kartlar, Arama ve Varlık Modalı', async ({ page }) => {
    await loginAs(page);
    await page.goto('/departments');

    await expect(page.locator('h1:has-text("30 Kurumsal Müdürlük")')).toBeVisible();

    // Arama kutusu
    const searchInput = page.locator('input[placeholder*="Müdürlük, kod"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Zabıta');
    await expect(page.locator('h3:has-text("Zabıta Müdürlüğü")')).toBeVisible();

    // Kart tıklama ve modal
    const zabitaCard = page.locator('div.cursor-pointer:has-text("Zabıta Müdürlüğü")').first();
    await zabitaCard.click();

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Zabıta Müdürlüğü')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('5. Personel Yönetimi (/personnel): Tablo, Müdürlük Filtresi ve Zimmet Modalı', async ({ page }) => {
    await loginAs(page);
    await page.goto('/personnel');

    await expect(page.locator('h1:has-text("Personel Yönetimi")')).toBeVisible();

    // Tablo satırları
    await expect(page.locator('table tbody tr')).not.toHaveCount(0);

    // "Zimmetleri Gör" butonu
    const firstZimmetBtn = page.locator('button:has-text("Zimmetleri Gör")').first();
    await expect(firstZimmetBtn).toBeVisible();
    await firstZimmetBtn.click();

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Personele Zimmetli Varlıklar')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('6. 16 Ana Varlık Kategorisi (/categories): Büyük Kartlar ve Detay', async ({ page }) => {
    await loginAs(page);
    await page.goto('/categories');

    await expect(page.locator('h1:has-text("16 Ana Varlık Kategorisi")')).toBeVisible();

    // Kategori kartı tıklama
    const firstCatCard = page.locator('div.cursor-pointer:has-text("Demirbaş")').first();
    await expect(firstCatCard).toBeVisible();
    await firstCatCard.click();

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('7. Hareketler ve Konum Transferleri (/movements): Denetim Tablosu', async ({ page }) => {
    await loginAs(page);
    await page.goto('/movements');

    await expect(page.locator('h1:has-text("Hareketler ve Konum Transferleri")')).toBeVisible();
    await expect(page.locator('th:has-text("Tarih / Saat")')).toBeVisible();
    await expect(page.locator('th:has-text("Varış Konumu")')).toBeVisible();
  });

  test('8. Belge ve Evrak Arşivi (/documents): Tablo ve İndirme Tetikleme', async ({ page }) => {
    await loginAs(page);
    await page.goto('/documents');

    await expect(page.locator('h1:has-text("Belge ve Evrak Arşivi")')).toBeVisible();
    await expect(page.locator('th:has-text("Evrak Kodu")')).toBeVisible();

    // İndir butonuna tıklama ve toast bildirimi
    const downloadBtn = page.locator('button:has-text("İndir")').first();
    if (await downloadBtn.isVisible()) {
      await downloadBtn.click();
      await expect(page.locator('div[role="alert"]:has-text("indiriliyor")').first()).toBeVisible();
    }
  });

  test('9. Raporlama ve Amortisman Analizi (/reports): Mali KPI, Cetvel ve CSV İndirme', async ({ page }) => {
    await loginAs(page);
    await page.goto('/reports');

    await expect(page.locator('h1:has-text("Raporlama ve Amortisman Analizi")')).toBeVisible();
    await expect(page.locator('text=Toplam Edinim Bedeli').first()).toBeVisible();
    await expect(page.locator('text=Birikmiş Amortisman').first()).toBeVisible();
    await expect(page.locator('text=Net Defter Değeri').first()).toBeVisible();

    // 74 satırlık cetvelin yüklenmesi
    await expect(page.locator('table tbody tr')).not.toHaveCount(0);

    // CSV indirme tetikleme
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("CSV Olarak İndir")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Gebze_Belediyesi_Amortisman_Raporu_2026.csv');
  });

  test('10. QR Kod ve Etiket Yönetimi (/qrcodes): Barkod Sorgulama ve Etiket Kartları', async ({ page }) => {
    await loginAs(page);
    await page.goto('/qrcodes');

    await expect(page.locator('h1:has-text("QR Kod ve Etiket Yönetimi")')).toBeVisible();

    // Etiket kartları görünümü
    await expect(page.locator('div:has-text("T.C. GEBZE BELEDİYESİ")').first()).toBeVisible();

    // Anlık QR kod sorgulama testi
    await page.fill('input[placeholder*="GBZ-AST-001"]', 'GBZ-AST-144');
    await page.click('button:has-text("Sorgula")');

    // Sonuç alanında varlık adının gelmesi
    await expect(page.locator('div:has-text("Tahmini Değer")').first()).toBeVisible();
  });

  test('11. Salt Okunur Denetçi (AUDITOR): 10 Ekranın Tamamına Hatasız Erişim', async ({ page }) => {
    await loginAs(page, 'ic_denetci', 'GebzeDev2026!');

    // Auditor 10 ekranın hepsine girebilir
    const readRoutes = ['/dashboard', '/tree', '/locations', '/departments', '/personnel', '/categories', '/movements', '/documents', '/reports', '/qrcodes'];
    for (const route of readRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      await expect(page.locator('div[role="alert"]:has-text("yetkiniz bulunmamaktadır")')).not.toBeVisible();
    }
  });

  test('12. Saha Personeli (STAFF): Kısıtlı Rotaya Girişte Pano Yönlendirmesi ve İzin Uyarısı', async ({ page }) => {
    await loginAs(page, 'saha_personel', 'GebzeDev2026!');

    // STAFF /reports veya /tree rotasına girmeyi denerse ana ekrana yönlendirilmeli ve uyarı gösterilmeli
    await page.goto('/reports');
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('div[role="alert"]:has-text("yetkiniz bulunmamaktadır")').first()).toBeVisible();
  });
});
