const fs = require('fs');
const path = require('path');

const forbidden = ['Sayın', 'Başkan', 'ay sonra', 'hafta', 'iş günü', 'P1', 'garanti', '%100'];
const targets = [
  'docs/Gebze_Varlik_Yonetimi_Yonetici_Raporu.pdf',
  'docs/kalan-isler.md',
  'scripts/generate_executive_report_pdf.js'
];

console.log('=== YASAKLI KELİME KONTROLÜ ===');
let foundTotal = 0;

targets.forEach((file) => {
  if (!fs.existsSync(file)) return;
  if (file.endsWith('.pdf')) return; // We'll extract text from PDF separately
  const content = fs.readFileSync(file, 'utf8');
  forbidden.forEach((word) => {
    // regex case insensitive or exact
    const re = new RegExp(word, 'gi');
    const matches = content.match(re);
    if (matches && matches.length > 0) {
      console.log(`[UYARI] ${file} içinde '${word}' bulundu: ${matches.length} adet`);
      foundTotal += matches.length;
    }
  });
});

console.log(`Toplam bulunan: ${foundTotal}`);
