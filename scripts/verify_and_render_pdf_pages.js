const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));

const artifactDir = 'C:/Users/Asus/.gemini/antigravity/brain/b7d1c8b5-7307-48ce-840e-28602d18dea6';
const forbidden = ['Sayın', 'Başkan', 'ay sonra', 'hafta', 'iş günü', 'P1', 'garanti', '%100'];

async function main() {
  console.log('=== PDF SAYFA GÖRSELLEŞTİRME VE METİN KONTROLÜ ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });

  // generate_executive_report_pdf.js icindeki htmlContent'i al
  const scriptContent = fs.readFileSync(path.resolve(__dirname, 'generate_executive_report_pdf.js'), 'utf8');
  const match = scriptContent.match(/const htmlContent = `([\s\S]+?)`;\s*async function generatePDF/);
  if (!match) {
    console.error('htmlContent parse edilemedi!');
    process.exit(1);
  }

  // Evaluate the template string
  const metrics = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/report_metrics.json'), 'utf8'));
  const formatCurrencyTRY = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

  function getBase64Image(relativePath) {
    const fullPath = path.resolve(__dirname, '..', relativePath);
    if (!fs.existsSync(fullPath)) return '';
    const ext = path.extname(fullPath).toLowerCase().replace('.', '');
    const data = fs.readFileSync(fullPath).toString('base64');
    return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${data}`;
  }

  const images = {
    dashboard: getBase64Image('docs/screenshots/01-dashboard.png'),
    assets: getBase64Image('docs/screenshots/02-assets.png'),
    assetDetail: getBase64Image('docs/screenshots/03-asset-detail.png'),
    personnel: getBase64Image('docs/screenshots/04-personnel-assignments.png'),
    counting: getBase64Image('docs/screenshots/05-counting.png'),
    fleet: getBase64Image('docs/screenshots/06-fleet.png'),
    audit: getBase64Image('docs/screenshots/07-audit.png'),
    settings: getBase64Image('docs/screenshots/08-settings.png'),
  };

  const rawHtml = eval('`' + match[1] + '`');

  await page.setContent(rawHtml, { waitUntil: 'networkidle' });

  const pageElements = await page.$$('.page');
  console.log(`Toplam sayfa elementi bulundu: ${pageElements.length}`);

  let totalForbidden = 0;

  for (let i = 0; i < pageElements.length; i++) {
    const pageNum = i + 1;
    const pageEl = pageElements[i];
    const text = await pageEl.innerText();

    // Check forbidden words
    forbidden.forEach((word) => {
      const re = new RegExp(word, 'gi');
      const matches = text.match(re);
      if (matches && matches.length > 0) {
        console.log(`[HATA] Sayfa ${pageNum} içinde '${word}' bulundu: ${matches.length} adet!`);
        totalForbidden += matches.length;
      }
    });

    const screenshotPath = path.join(artifactDir, `sayfa-${pageNum}.png`);
    await pageEl.screenshot({ path: screenshotPath });
    console.log(`Sayfa ${pageNum} gorseli olusturuldu -> ${screenshotPath}`);
  }

  await browser.close();

  if (totalForbidden === 0) {
    console.log('\n[TEBRIKLER] PDF sayfalarinda HICBIR yasakli kelime bulunmuyor (0 Hata).');
  } else {
    console.error(`\n[UYARI] Toplam ${totalForbidden} yasakli kelime ihlali tespit edildi!`);
    process.exit(1);
  }
}

main().catch(console.error);
