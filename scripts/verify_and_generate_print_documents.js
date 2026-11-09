const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'playwright'));
const fs = require('fs');

async function main() {
  console.log('===================================================================');
  console.log('YAZDIRMA BELGELERİ DOĞRULAMA VE A4 PDF / EKRAN GÖRÜNTÜSÜ ÜRETİCİSİ');
  console.log('Belgeler: Zimmet Fişi, TİF Sarf Fişi, İlişik Kesme Tutanağı');
  console.log('===================================================================\n');

  const screenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'tr-TR'
  });
  const page = await context.newPage();

  try {
    // 1. Giriş Yap
    console.log('1. Admin kullanıcısı ile giriş yapılıyor...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    
    // Check if already logged in or login form
    const usernameInput = page.locator('input[type="text"]');
    if (await usernameInput.isVisible()) {
      await usernameInput.fill('admin');
      await page.locator('input[type="password"]').fill('GebzeDev2026!');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/.*dashboard.*/, { timeout: 10000 });
    }
    console.log('-> Giriş başarılı, ana sayfaya ulaşıldı.');

    // 2. Zimmet Fişi (A4)
    console.log('\n2. Zimmet Yönetimi ekranı açılıyor (/assignments)...');
    await page.goto('http://localhost:5173/assignments', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const slipBtn = page.locator('button[title*="Resmi Zimmet Fişi"]').first();
    await slipBtn.waitFor({ state: 'visible', timeout: 8000 });
    await slipBtn.click();
    console.log('-> Zimmet Fişi modalı açıldı.');
    await page.waitForTimeout(600);

    // İçerik ve dil kontrolleri
    const slipText = await page.locator('div[role="dialog"], .fixed.inset-0').first().innerText();
    assertCheck('Zimmet Fişi Belediye Başlığı', slipText.includes('T.C. GEBZE BELEDİYESİ'));
    assertCheck('Zimmet Fişi Belge Başlığı', slipText.includes('TAŞINIR TESLİM VE ZİMMET SENEDİ'));
    assertCheck('Zimmet Fişi Taslak Şablon Uyarısı', slipText.includes('Taslak şablon; format ve hesap kodları Taşınır Kayıt Yetkilisi onayına tabidir.'));
    assertCheck('Zimmet Fişi Teslim Eden İmzası', slipText.includes('TESLİM EDEN'));
    assertCheck('Zimmet Fişi Teslim Alan İmzası', slipText.includes('TESLİM ALAN (ZİMMET SAHİBİ)'));
    assertCheck('Zimmet Fişi Yasaklı İfade Yokluğu', !slipText.includes('Taşınır Mal Yönetmeliği formatında'));

    // A4 PDF ve Ekran Görüntüsü
    await page.emulateMedia({ media: 'print' });
    const zimmetPdfPath = path.join(screenshotsDir, 'print-zimmet-fisi.pdf');
    const zimmetPngPath = path.join(screenshotsDir, 'print-zimmet-fisi.png');
    await page.pdf({ path: zimmetPdfPath, format: 'A4', printBackground: true });
    await page.screenshot({ path: zimmetPngPath, fullPage: true });
    console.log(`-> Zimmet Fişi Kaydedildi: ${zimmetPngPath} (${fs.statSync(zimmetPdfPath).size} bytes PDF)`);
    await page.emulateMedia({ media: 'screen' });

    // Modalı kapat
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 3. TİF Sarf Fişi (A4)
    console.log('\n3. Depo & Stok Yönetimi ekranı açılıyor (/stock)...');
    await page.goto('http://localhost:5173/stock', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Geçmiş Hareketler sekmesine tıkla
    const historyTab = page.locator('button:has-text("Geçmiş Stok Hareketleri")');
    await historyTab.waitFor({ state: 'visible', timeout: 8000 });
    await historyTab.click();
    await page.waitForTimeout(800);

    const tifBtn = page.locator('button[title*="Taşınır İşlem Fişi"]').first();
    await tifBtn.waitFor({ state: 'visible', timeout: 8000 });
    await tifBtn.click();
    console.log('-> TİF Sarf Fişi modalı açıldı.');
    await page.waitForTimeout(600);

    const tifText = await page.locator('div[role="dialog"], .fixed.inset-0').first().innerText();
    assertCheck('TİF Fişi Belediye Başlığı', tifText.includes('T.C. GEBZE BELEDİYESİ'));
    assertCheck('TİF Fişi Belge Başlığı', tifText.includes('TAŞINIR İŞLEM FİŞİ (TİF)'));
    assertCheck('TİF Fişi Taslak Şablon Uyarısı', tifText.includes('Taslak şablon; format ve hesap kodları Taşınır Kayıt Yetkilisi onayına tabidir.'));
    assertCheck('TİF Fişi Teslim Eden İmzası', tifText.includes('TESLİM EDEN'));
    assertCheck('TİF Fişi Teslim Alan İmzası', tifText.includes('TESLİM ALAN'));
    assertCheck('TİF Fişi Yasaklı İfade Yokluğu', !tifText.includes('Taşınır Mal Yönetmeliği formatında'));

    await page.emulateMedia({ media: 'print' });
    const tifPdfPath = path.join(screenshotsDir, 'print-tif-fisi.pdf');
    const tifPngPath = path.join(screenshotsDir, 'print-tif-fisi.png');
    await page.pdf({ path: tifPdfPath, format: 'A4', printBackground: true });
    await page.screenshot({ path: tifPngPath, fullPage: true });
    console.log(`-> TİF Fişi Kaydedildi: ${tifPngPath} (${fs.statSync(tifPdfPath).size} bytes PDF)`);
    await page.emulateMedia({ media: 'screen' });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 4. Personel İlişik Kesme Tutanağı (A4)
    console.log('\n4. Personel Yönetimi ekranı açılıyor (/personnel)...');
    await page.goto('http://localhost:5173/personnel', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const clearanceBtn = page.locator('button[title*="İlişik Kesme Belgesi"]').first();
    await clearanceBtn.waitFor({ state: 'visible', timeout: 8000 });
    await clearanceBtn.click();
    console.log('-> İlişik Kesme Tutanağı modalı açıldı.');
    await page.waitForTimeout(800);

    const clearanceText = await page.locator('div[role="dialog"], .fixed.inset-0').first().innerText();
    assertCheck('İlişik Kesme Belediye Başlığı', clearanceText.includes('T.C. GEBZE BELEDİYESİ'));
    assertCheck('İlişik Kesme Belge Başlığı', clearanceText.includes('TAŞINIR MAL VE ZİMMET İLİŞİK KESME BELGESİ'));
    assertCheck('İlişik Kesme Taslak Şablon Uyarısı', clearanceText.includes('Taslak şablon; format ve hesap kodları Taşınır Kayıt Yetkilisi onayına tabidir.'));
    assertCheck('İlişik Kesme Taşınır Kayıt İmzası', clearanceText.includes('TAŞINIR KAYIT YETKİLİSİ'));
    assertCheck('İlişik Kesme İnsan Kaynakları İmzası', clearanceText.includes('İNSAN KAYNAKLARI YETKİLİSİ'));
    assertCheck('İlişik Kesme İlgili Personel İmzası', clearanceText.includes('İLGİLİ PERSONEL'));
    assertCheck('İlişik Kesme Yasaklı İfade Yokluğu', !clearanceText.includes('Taşınır Mal Yönetmeliği formatında'));

    await page.emulateMedia({ media: 'print' });
    const clearancePdfPath = path.join(screenshotsDir, 'print-ilisik-kesme.pdf');
    const clearancePngPath = path.join(screenshotsDir, 'print-ilisik-kesme.png');
    await page.pdf({ path: clearancePdfPath, format: 'A4', printBackground: true });
    await page.screenshot({ path: clearancePngPath, fullPage: true });
    console.log(`-> İlişik Kesme Tutanağı Kaydedildi: ${clearancePngPath} (${fs.statSync(clearancePdfPath).size} bytes PDF)`);
    await page.emulateMedia({ media: 'screen' });

    console.log('\n===================================================================');
    console.log('SONUÇ: TÜM YAZDIRMA BELGELERİ A4 PDF VE EKRAN GÖRÜNTÜLERİ DOĞRULANDI!');
    console.log('===================================================================');
  } finally {
    await browser.close();
  }
}

function assertCheck(label, condition) {
  if (!condition) {
    console.error(`❌ [HATA] ${label} doğrulaması başarısız oldu!`);
    process.exit(1);
  } else {
    console.log(`  ✓ [DOĞRULANDI] ${label}`);
  }
}

main().catch((err) => {
  console.error('Hata:', err);
  process.exit(1);
});
