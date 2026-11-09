const fs = require('fs');
const path = require('path');

const forbidden = ['Sayın', 'Başkan', 'ay sonra', 'hafta', 'iş günü', 'P1', 'garanti', '%100'];

function getAllFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else {
      if (exts.some((ext) => file.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const docsFiles = getAllFiles(path.join(__dirname, '..', 'docs'), ['.md', '.sql']);
const targets = [
  ...docsFiles,
  path.join(__dirname, 'generate_executive_report_pdf.js')
];

console.log('=== YASAKLI KELİME KONTROLÜ (TÜM DOCS MD, SQL VE RAPOR KODU) ===');
let foundTotal = 0;

targets.forEach((file) => {
  const rel = path.relative(path.join(__dirname, '..'), file);
  const content = fs.readFileSync(file, 'utf8');
  forbidden.forEach((word) => {
    // Regex matches
    const re = new RegExp(word, 'gi');
    const matches = content.match(re);
    if (matches && matches.length > 0) {
      console.log(`[BULGU] ${rel} -> '${word}': ${matches.length} eşleşme`);
      foundTotal += matches.length;
    }
  });
});

console.log(`\nToplam bulunan yasaklı kelime sayısı: ${foundTotal}`);
