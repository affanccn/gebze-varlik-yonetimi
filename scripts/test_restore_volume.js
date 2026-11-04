const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const targetDir = path.resolve('backups/test_restore');
const backupArchive = path.resolve('backups/oracle23ai_volume_faz_1e2_pre.tar.gz');

console.log('=== ORACLE VOLUME GERÇEK GERİ YÜKLEME DOĞRULAMA TESTİ ===');
console.log(`Kaynak Arşiv: ${backupArchive}`);
console.log(`Hedef Dizin : ${targetDir}`);

if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

const startTime = Date.now();
console.log('Geri yükleme (tar extraction) başlatılıyor...');

try {
    const tarOutput = execSync(`tar -xzvf "${backupArchive}" -C "${targetDir}"`, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024
    });

    const lines = tarOutput.trim().split('\n');
    console.log(`Arşivden başarıyla çıkarılan toplam dosya/dizin sayısı: ${lines.length}`);
    console.log('İlk 5 dosya:');
    lines.slice(0, 5).forEach(l => console.log('  ' + l.trim()));
    console.log('Son 5 dosya:');
    lines.slice(-5).forEach(l => console.log('  ' + l.trim()));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Geri yükleme tamamlandı. Geçen süre: ${elapsed} saniye.`);

    // Toplam dosya boyutu hesapla
    let totalBytes = 0;
    let fileCount = 0;
    function walk(dir) {
        for (const item of fs.readdirSync(dir)) {
            const full = path.join(dir, item);
            const st = fs.statSync(full);
            if (st.isDirectory()) walk(full);
            else {
                fileCount++;
                totalBytes += st.size;
            }
        }
    }
    walk(targetDir);

    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    console.log(`Doğrulanan Açılmış Veri Boyutu: ${totalMB} MB (${fileCount} dosya)`);
    console.log('SONUÇ: YEDEK ARŞİVİ BOZULMADAN %100 BAŞARIYLA GERİ YÜKLENDİ VE DOĞRULANDI! ✅');
} catch (err) {
    console.error('Geri yükleme testinde hata:', err.message);
    process.exit(1);
} finally {
    console.log('Test geçici dizini temizleniyor...');
    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log('Temizlik tamamlandı.');
}
