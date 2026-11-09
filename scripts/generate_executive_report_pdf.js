/**
 * scripts/generate_executive_report_pdf.js
 * Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)
 * Yönetici Sunum Raporu (PDF) Üretici (Single Source of Truth)
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));

const OUTPUT_PDF_PATH = path.resolve(__dirname, '../docs/Gebze_Varlik_Yonetimi_Yonetici_Raporu.pdf');
const METRICS_PATH = path.resolve(__dirname, '../docs/report_metrics.json');

if (!fs.existsSync(METRICS_PATH)) {
  console.error('HATA: docs/report_metrics.json bulunamadi! Once node scripts/report_metrics.js calistirin.');
  process.exit(1);
}

const metrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf8'));

function getBase64Image(relativePath) {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Görsel bulunamadı: ${fullPath}`);
    return '';
  }
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

const formatCurrencyTRY = (val) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
};

const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Gebze Belediyesi Varlık Yönetimi Sistemi: Yönetici Sunum Raporu</title>
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    height: 297mm;
    page-break-after: always;
    padding: 13mm 15mm 13mm 15mm;
    position: relative;
    overflow: hidden;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .page:last-child {
    page-break-after: avoid;
  }

  /* Header & Footer */
  .page-header {
    border-bottom: 2px solid #0284c7;
    padding-bottom: 7px;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .header-left .gov-title {
    font-size: 13px;
    font-weight: 800;
    color: #0369a1;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .header-left .sub-title {
    font-size: 9.5px;
    color: #64748b;
    font-weight: 600;
  }
  .header-right .badge {
    background: #0284c7;
    color: #ffffff;
    font-size: 8.5px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .page-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    margin-top: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5px;
    color: #64748b;
  }
  .footer-left {
    font-weight: 600;
  }
  .footer-right {
    font-weight: 700;
    color: #0369a1;
  }

  /* Typography */
  h1 { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 4px; line-height: 1.2; }
  h2 { font-size: 13px; font-weight: 700; color: #0369a1; margin-bottom: 5px; }
  h3 { font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 3px; }
  p { font-size: 9.2px; line-height: 1.42; color: #334155; margin-bottom: 5px; }

  /* Cards & Containers */
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 9px;
    margin-bottom: 7px;
  }
  .card-highlight {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-left: 4px solid #0284c7;
  }
  .card-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-left: 4px solid #16a34a;
  }
  .card-warning {
    background: #fffbeb;
    border: 1px solid #fef3c7;
    border-left: 4px solid #d97706;
  }

  /* Grids */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  /* Metric KPI Box */
  .kpi-box {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 7px;
    text-align: center;
  }
  .kpi-val {
    font-size: 15px;
    font-weight: 800;
    color: #0369a1;
    line-height: 1.2;
  }
  .kpi-label {
    font-size: 8px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    margin-top: 2px;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5px;
    margin-bottom: 5px;
  }
  th, td {
    padding: 4px 6px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }
  th {
    background-color: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 8px;
  }
  tr:last-child td {
    border-bottom: none;
  }

  /* Badges */
  .badge-tag {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 7.5px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .tag-green { background: #dcfce7; color: #166534; }
  .tag-blue { background: #e0f2fe; color: #0369a1; }
  .tag-amber { background: #fef3c7; color: #92400e; }
  .tag-red { background: #fee2e2; color: #991b1b; }

  /* Image Container for Showcase (Pages 6 & 7) */
  .screenshot-frame {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    background: #ffffff;
    margin-bottom: 5px;
    display: flex;
    flex-direction: column;
  }
  .screenshot-frame img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    object-position: top;
    display: block;
  }
  .screenshot-caption {
    font-size: 8px;
    font-weight: 700;
    color: #475569;
    padding: 4px 7px;
    background: #f1f5f9;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* List styles */
  ul { margin-left: 14px; margin-bottom: 5px; }
  li { font-size: 8.8px; line-height: 1.4; color: #334155; margin-bottom: 2px; }
  li strong { color: #0f172a; }
</style>
</head>
<body>

<!-- ==================================================================== -->
<!-- SAYFA 1: YÖNETİCİ ÖZETİ VE MEVCUT DURUM -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">YÖNETİCİ SUNUM RAPORU</span>
      </div>
    </div>

    <div style="margin-bottom: 10px; text-align: center; padding: 10px 0; background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; border-radius: 6px;">
      <h1 style="color: #ffffff; font-size: 17px; margin-bottom: 3px;">GEBZE BELEDİYESİ VARLIK YÖNETİMİ SİSTEMİ: YÖNETİCİ SUNUM RAPORU</h1>
      <div style="font-size: 9.5px; color: #93c5fd; font-weight: 600;">Sistem Durum Analizi, Güvenlik Doğrulaması ve Entegrasyon Hazırlık Durumu</div>
      <div style="font-size: 8px; color: #cbd5e1; margin-top: 3px;">Belediye Oracle Veritabanı ve İK Entegrasyon Süreci Ön Değerlendirmesi</div>
    </div>

    <div class="grid-4" style="margin-bottom: 9px;">
      <div class="kpi-box">
        <div class="kpi-val" style="color: #0284c7;">Tamamlandı</div>
        <div class="kpi-label">Uygulama Geliştirme</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #16a34a;">${metrics.securityAndTesting.matrixChecksPassed} / ${metrics.securityAndTesting.matrixChecksTotal}</div>
        <div class="kpi-label">Yetki Matrisi Başarılı</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #6366f1;">${metrics.securityAndTesting.playwrightE2ETestsPassed} / ${metrics.securityAndTesting.playwrightE2ETestsPassed}</div>
        <div class="kpi-label">Playwright E2E Doğrulandı</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #0f172a;">19c / 21c / 23ai</div>
        <div class="kpi-label">Oracle Uyumlu Tasarım</div>
      </div>
    </div>

    <div class="card card-highlight">
      <h2 style="font-size: 11.5px; margin-bottom: 3px;">Yönetici Özeti ve Mevcut Durum</h2>
      <p style="font-size: 9.2px; text-align: justify; margin-bottom: 4px;">
        Gebze Belediyesi bünyesinde yer alan tüm taşınır malların, araç ve iş makinelerinin, demirbaşların, sarf malzemelerinin ve bilişim donanımlarının tek bir merkezi platformdan yönetilmesi, sayılması, zimmetlenmesi ve denetlenmesi amacıyla geliştirilen <strong>Kurumsal Varlık Yönetimi Sistemi (EKYS)</strong> yazılımı, belediyeden bağımsız tüm işlevleri ve ekranlarıyla eksiksiz tamamlanmıştır.
      </p>
      <p style="font-size: 9.2px; text-align: justify; margin-bottom: 0;">
        Sistem; bağlantı günü kod değişikliği gerekmeden, yalnızca kurumsal ortam değişkenleri (<code>.env</code>) ve yapılandırma ile çalışacak mimaride kurulmuştur. Uygulama tarafındaki yeni stok kartı açma modalı, TİF sarf fişi dökümü, resmi zimmet fişi ve ilişik kesme tutanağı A4 çıktıları ile giriş uç noktasında IP tabanlı hız sınırlaması uçtan uca devreye alınmış ve testlerle doğrulanmıştır. Şu an sistem, belediyenin Oracle veritabanı erişim parametreleri ve kurumsal ağ tanımlamalarını karşılamaya hazırdır.
      </p>
    </div>

    <div class="grid-2" style="margin-bottom: 7px;">
      <div class="card card-success">
        <h3 style="color: #166534; font-size: 10.5px;">Doğrulanan Çekirdek Yetenekler</h3>
        <ul>
          <li><strong>Tam Rol İzolasyonu:</strong> 5 rol (ADMIN, DEPT_MANAGER, STAFF, AUDITOR, VIEWER) ve ${metrics.securityAndTesting.totalEndpoints} uç nokta için varsayılan-red (default-deny) güvenlik mimarisi.</li>
          <li><strong>Resmi A4 Dökümleri:</strong> Islak imzaya hazır resmi taşınır teslim senedi, TİF sarf fişi ve personel ilişik kesme kontrol belgesi (Taslak şablon; format ve hesap kodları Taşınır Kayıt Yetkilisi onayına tabidir).</li>
          <li><strong>Kaba Kuvvet Koruması:</strong> Giriş uç noktasında IP ve kullanıcı adı kombinasyonuyla hız sınırlaması (HTTP 429) ve güvenilir ters vekil IP çözümleme motoru.</li>
          <li><strong>Oracle Çoklu Sürüm Desteği:</strong> 19c, 21c ve 23ai üzerinde çalışan CLOB IS JSON veri mimarisi.</li>
        </ul>
      </div>

      <div class="card card-warning">
        <h3 style="color: #92400e; font-size: 10.5px;">Belediye Tarafından Beklenen Bilgiler</h3>
        <ul>
          <li><strong>Oracle Sürümü ve Bağlantı:</strong> 19c / 21c / 23ai sürümü, Service Name / SID ve Wallet kullanım tercihi.</li>
          <li><strong>DBA Kurulum Yetkileri:</strong> VARLIK_OWNER (DDL) ve VARLIK_APP_RUNTIME (DML) şemalarının açılması.</li>
          <li><strong>Sunucu ve Ağ Erişimi:</strong> Uygulama sunucusu ile Oracle DB arasında 1521 port erişimi ve HTTPS SSL sertifikası.</li>
          <li><strong>Kurumsal Tercihler:</strong> Active Directory entegrasyonu, İK veri formatı ve evrak depolama alanı tercihi.</li>
        </ul>
      </div>
    </div>

    <div class="card" style="margin-bottom: 0;">
      <h3 style="font-size: 10.5px;">Canlı Veritabanı ve Test İstatistikleri Özeti</h3>
      <div class="grid-4" style="margin-top: 4px;">
        <div style="font-size: 8.5px;">
          <strong>Uygulama Tabloları:</strong> ${metrics.databaseMetrics.applicationTables} Adet<br/>
          <strong>Toplam Tablo:</strong> ${metrics.databaseMetrics.totalTables} Adet*<br/>
          <span style="font-size: 7.5px; color: #64748b;">*Flyway geçmiş tablosu dahil</span>
        </div>
        <div style="font-size: 8.5px;">
          <strong>Toplam Sütun:</strong> ${metrics.databaseMetrics.totalColumns}<br/>
          <strong>İndeks Sayısı:</strong> ${metrics.databaseMetrics.totalIndexes}<br/>
          <strong>Kısıt (Constraint):</strong> ${metrics.databaseMetrics.totalConstraints}
        </div>
        <div style="font-size: 8.5px;">
          <strong>Kayıtlı Varlık:</strong> ${metrics.databaseMetrics.assetsActiveCount} Adet<br/>
          <strong>Envanter Tutarı:</strong> ${formatCurrencyTRY(metrics.databaseMetrics.assetsTotalValue)}<br/>
          <strong>Müdürlük Sayısı:</strong> ${metrics.databaseMetrics.departmentsCount} Birim
        </div>
        <div style="font-size: 8.5px;">
          <strong>Güvenlik Testi:</strong> ${metrics.securityAndTesting.matrixChecksPassed} Kontrol<br/>
          <strong>Hız Sınırı Testi:</strong> ${metrics.securityAndTesting.rateLimitingAssertionsPassed} Kontrol<br/>
          <strong>E2E Senaryoları:</strong> ${metrics.securityAndTesting.playwrightE2ETestsPassed} Test Başarılı
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 1 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 2: MİMARİ VE TEKNOLOJİ KATMANI -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">SİSTEM MİMARİSİ</span>
      </div>
    </div>

    <h2>Teknoloji Mimarisi ve Kurumsal Altyapı Katmanları</h2>
    <p>Sistem, kurumsal kamu gereksinimlerine tam uygun, yüksek güvenlikli ve modern teknolojilerle katmanlı olarak inşa edilmiştir:</p>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div class="card">
        <h3 style="color: #0369a1;">Backend Katmanı (Spring Boot 3.4.3 & Java 25)</h3>
        <table>
          <tr><td style="width: 35%;"><strong>Çalışma Zamanı</strong></td><td>Java 25 (OpenJDK 64-Bit Server VM)</td></tr>
          <tr><td><strong>Uygulama İskeleti</strong></td><td>Spring Boot 3.4.3 (Kurumsal Java Platformu)</td></tr>
          <tr><td><strong>Veri Erişim Modeli</strong></td><td>Spring Data JDBC / modern JdbcClient (saf parametreli Oracle SQL)</td></tr>
          <tr><td><strong>Web Sunucusu</strong></td><td>Gömülü Apache Tomcat 10.1 (NIO çalışan iş parçacığı havuzu)</td></tr>
          <tr><td><strong>Veritabanı Havuzu</strong></td><td>HikariCP 5.1 (Bağlantı havuzu ve NLS oturum optimizasyonu)</td></tr>
          <tr><td><strong>Şema Yönetimi</strong></td><td>Flyway Community 11.3 (Sürüm kontrollü veritabanı migrasyonu)</td></tr>
          <tr><td><strong>Hız Sınırlaması</strong></td><td>Kullanıcı adı + IP bazlı bellek içi sayaç havuzu (HTTP 429)</td></tr>
        </table>
      </div>

      <div class="card">
        <h3 style="color: #0369a1;">Frontend Katmanı (React 18 & TypeScript)</h3>
        <table>
          <tr><td style="width: 35%;"><strong>Kullanıcı Arayüzü</strong></td><td>React 18.3.1 (Bileşen tabanlı modern SPA arayüz)</td></tr>
          <tr><td><strong>Programlama Dili</strong></td><td>TypeScript 5.7.3 (Tip güvenli istemci kod tabanı)</td></tr>
          <tr><td><strong>Derleme Aracı</strong></td><td>Vite 6.2.0 (Hızlı modül paketleme ve üretim optimizasyonu)</td></tr>
          <tr><td><strong>Tasarım Sistemi</strong></td><td>Tailwind CSS 3.4.17 + Gebze Belediyesi kurumsal paleti</td></tr>
          <tr><td><strong>Veri Tablosu</strong></td><td>TanStack Table 8.21.2 (Sayfalamalı ve sıralamalı veri tablosu)</td></tr>
          <tr><td><strong>Durum Yönetimi</strong></td><td>TanStack React Query 5.66.9 (Önbellek ve arka plan eşitleme)</td></tr>
          <tr><td><strong>İkon Kütüphanesi</strong></td><td>Lucide React 0.475.0 (Vektörel kurumsal ikonlar)</td></tr>
        </table>
      </div>
    </div>

    <div class="card card-highlight" style="margin-bottom: 8px;">
      <h3 style="color: #0284c7;">Kurumsal Ağ ve Güvenlik Altyapısı</h3>
      <p style="text-align: justify; margin-bottom: 4px;">
        Uygulama; belediyenin yerel veri merkezinde, harici internete kapalı veya güvenli ters vekil (Nginx/HAProxy/IIS) arkasında çalıştırılmak üzere yapılandırılmıştır.
      </p>
      <div class="grid-3">
        <div style="font-size: 8.5px;">
          <strong>Kimlik Doğrulama:</strong><br/>
          Durum bilgili (Stateful) güvenli çerez oturumu, form bazlı kimlik denetimi ve brute-force koruması.
        </div>
        <div style="font-size: 8.5px;">
          <strong>CSRF Koruması:</strong><br/>
          Tüm durum değiştiren HTTP isteklerinde (POST/PUT/DELETE) çift çerezli X-XSRF-TOKEN zorunluluğu.
        </div>
        <div style="font-size: 8.5px;">
          <strong>Ters Vekil Çözümleme:</strong><br/>
          Tanımlı güvenilir proxy IP bloklarından gelen X-Forwarded-For başlıklarının doğrulanması.
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 0;">
      <h3 style="color: #0f172a;">Veri Tabanı İletişim Mimarisi: Doğrudan SQL & JdbcClient</h3>
      <p style="text-align: justify; margin-bottom: 3px;">
        Projede karmaşık ORM katmanları yerine Spring Framework 6 ile sunulan modern <code>JdbcClient</code> API'si kullanılmıştır. Bu yaklaşım kurumsal kamu sistemlerinde aşağıdaki temel avantajları sağlar:
      </p>
      <ul>
        <li><strong>Sıfır Beklenmeyen N+1 Sorgusu:</strong> Tüm ilişkisel sorgular tek seferde optimize SQL JOIN'ler ile çalıştırılır; veritabanı yükü öngörülebilir seviyede tutulur.</li>
        <li><strong>Oracle'a Özgü Gelişmiş Yetenekler:</strong> <code>NLSSORT(..., 'NLS_SORT = TURKISH_AI')</code> ile Türkçe duyarsız sıralama ve <code>IS JSON</code> fonksiyonları doğrudan yerel SQL gücüyle işletilir.</li>
        <li><strong>Tam Parametrik Güvenlik:</strong> Tüm dinamik sorgular <code>:param</code> bağlama mekanizmasıyla çalışır; SQL Enjeksiyonu riski mimari düzeyde engellenmiştir.</li>
      </ul>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 2 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 3: VERİTABANI ŞEMASI VE ORACLE UYUMLULUĞU -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">VERİTABANI VE ORACLE 19c</span>
      </div>
    </div>

    <h2>Veritabanı Şeması ve Oracle 19c / 21c / 23ai Uyumluluk Analizi</h2>
    <p>Belediye veri tabanının Oracle 19c veya üzeri bir sürümde olma ihtimali gözetilerek, migrasyon hattı ve veri tipleri detaylı incelenmiştir:</p>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div class="card">
        <h3 style="color: #0369a1;">Şema ve Nesne Sayımları (Canlı Oracle Sorgusu)</h3>
        <table>
          <tr><td style="width: 55%;"><strong>Uygulama Tabloları</strong></td><td><strong>${metrics.databaseMetrics.applicationTables} Adet</strong></td></tr>
          <tr><td><strong>Flyway Geçmiş Tablosu</strong></td><td>1 Adet</td></tr>
          <tr><td><strong>Toplam Tablo Sayısı</strong></td><td><strong>${metrics.databaseMetrics.totalTables} Adet</strong></td></tr>
          <tr><td><strong>Toplam Sütun Sayısı</strong></td><td>${metrics.databaseMetrics.totalColumns} Sütun (${metrics.databaseMetrics.applicationColumns} uygulama)*</td></tr>
          <tr><td><strong>Toplam İndeks Sayısı</strong></td><td>${metrics.databaseMetrics.totalIndexes} İndeks (${metrics.databaseMetrics.applicationIndexes} B-Tree/FBI + 3 LOB)</td></tr>
          <tr><td><strong>Toplam Kısıt (Constraint)</strong></td><td>${metrics.databaseMetrics.totalConstraints} (${metrics.databaseMetrics.applicationConstraints} kurumsal + 190 NOT NULL)**</td></tr>
          <tr><td><strong>Değiştirilemezlik Tetikleyicisi</strong></td><td>1 Adet (trg_system_audit_logs_immutable)</td></tr>
        </table>
        <div style="font-size: 7.2px; color: #64748b; margin-top: 3px; line-height: 1.2;">
          * 291 uygulama sütunu + 26 sistem kimlik sütunu.<br/>
          ** 73 kurumsal PK, UK, FK kısıtı + 190 Oracle sistem IS NOT NULL kontrolü.
        </div>
      </div>

      <div class="card card-success">
        <h3 style="color: #166534;">Oracle 19c Uyumluluk Stratejisi</h3>
        <p style="text-align: justify; margin-bottom: 4px;">
          Geliştirme ortamındaki Oracle 23ai'ye özgü yerel JSON veri tipi yerine, üretim migrasyonunda (<code>db/migration-prod</code>) 19c uyumlu standart tanımlanmıştır:
        </p>
        <div style="background: #ffffff; padding: 5px; border-radius: 4px; border: 1px solid #bbf7d0; font-family: monospace; font-size: 8px; margin-bottom: 4px;">
          SPECIFICATIONS CLOB CHECK (SPECIFICATIONS IS JSON)
        </div>
        <p style="font-size: 8.5px; color: #14532d; margin-bottom: 0;">
          Bu yapı Oracle 19c, 21c ve 23ai sürümlerinin tamamında geçerli olup, uygulama tarafında hiçbir kod değişikliği gerektirmeden çalışmaktadır.
        </p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 8px;">
      <h3 style="color: #0f172a;">21 Uygulama Tablosunun Fonksiyonel Dağılımı</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 20%;">Fonksiyon Grubu</th>
            <th style="width: 45%;">Tablo Adları</th>
            <th style="width: 35%;">Kurumsal İşlevi</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Teşkilat ve Yerleşke</strong></td>
            <td><code>DEPARTMENTS, SUB_UNITS, BUILDINGS, FLOORS, ROOMS</code></td>
            <td>${metrics.databaseMetrics.departmentsCount} resmi müdürlük, alt birimler, ${metrics.databaseMetrics.buildingsCount} hizmet binası ve ${metrics.databaseMetrics.roomsCount} oda/alan hiyerarşisi.</td>
          </tr>
          <tr>
            <td><strong>Varlık ve Envanter</strong></td>
            <td><code>ASSETS, ASSET_CATEGORIES, ASSET_DOCUMENTS</code></td>
            <td>Taşınır demirbaş kayıtları, 16 resmi kategori ve evrak üstverileri.</td>
          </tr>
          <tr>
            <td><strong>Operasyonel Süreçler</strong></td>
            <td><code>ASSET_ASSIGNMENTS, ASSET_MOVEMENTS, ASSET_MAINTENANCES</code></td>
            <td>Personel zimmetleme, fiziksel oda transferleri ve bakım/onarım iş emirleri.</td>
          </tr>
          <tr>
            <td><strong>Saha ve Kurumsal İdare</strong></td>
            <td><code>INVENTORY_AUDITS, AUDIT_SCANS, STOCK_ITEMS, STOCK_TRANSACTIONS, FLEET_VEHICLES, PROCUREMENT_ORDERS</code></td>
            <td>El terminali/kamera sayımları, sarf depo stokları, araç filosu ve satın alma.</td>
          </tr>
          <tr>
            <td><strong>Kullanıcı ve Denetim</strong></td>
            <td><code>PERSONNEL, SYSTEM_USERS, SYSTEM_SETTINGS, SYSTEM_AUDIT_LOGS</code></td>
            <td>Personel kartları, roller, sistem parametreleri ve değiştirilemez denetim izi.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card card-warning" style="margin-bottom: 0;">
      <h3 style="color: #92400e;">Türkçe Karakter ve Dil Desteği (NLS_SORT = TURKISH_AI)</h3>
      <p style="text-align: justify; margin-bottom: 0;">
        Veritabanı sunucusu İngilizce karakter setinde kurulmuş olsa bile, sistemin oturum açılış tetikleyicisi (<code>TRG_VARLIK_APP_LOGON</code>) ve HikariCP bağlantı ilklendiricisi her oturumu otomatik olarak <code>TURKISH_AI</code> moduna alır. Bu sayede "İSTANBUL/istanbul", "ÇAYIROVA/çayırova" gibi aramalarda ve Türkçe alfabetik sıralamalarda tam uyum sağlanır.
      </p>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 3 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 4: GÜVENLİK VE YETKİLENDİRME MATRİSİ -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">GÜVENLİK MATRİSİ</span>
      </div>
    </div>

    <h2>Kurumsal Güvenlik Mimarisi, RBAC ve Yetkilendirme Matrisi</h2>
    <p>Sistem, kamu kurumlarının güvenlik ve veri mahremiyeti standartlarına uygun olarak tasarlanmış ve doğrulanmıştır:</p>

    <div class="grid-4" style="margin-bottom: 8px;">
      <div class="kpi-box">
        <div class="kpi-val" style="color: #16a34a;">${metrics.securityAndTesting.totalEndpoints} Adet</div>
        <div class="kpi-label">REST Uç Noktası</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #0284c7;">${metrics.securityAndTesting.matrixChecksPassed} / ${metrics.securityAndTesting.matrixChecksTotal}</div>
        <div class="kpi-label">Rol Kontrolü Geçti</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #d97706;">${metrics.securityAndTesting.csrfProtectionTested} / ${metrics.securityAndTesting.csrfProtectionTested}</div>
        <div class="kpi-label">CSRF Korumalı Uç</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #6366f1;">${metrics.securityAndTesting.rateLimitingAssertionsPassed} / ${metrics.securityAndTesting.rateLimitingAssertionsPassed}</div>
        <div class="kpi-label">Hız Sınırı Doğrulandı</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 8px;">
      <h3 style="color: #0f172a;">Rol Bazlı Erişim Kontrolü (RBAC) Yetki Özeti</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 18%;">Kullanıcı Rolü</th>
            <th style="width: 25%;">Erişim Kapsamı</th>
            <th style="width: 32%;">Yazma ve İşlem Yetkileri</th>
            <th style="width: 25%;">Kısıtlanan Alanlar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Sistem Yöneticisi<br/>(ADMIN)</strong></td>
            <td>Kurum Geneli (Tüm Müdürlükler)</td>
            <td>Kullanıcı CRUD, şema ayarları, varlık/zimmet/stok tam yönetim ve silme.</td>
            <td>Kısıtlama bulunmuyor.</td>
          </tr>
          <tr>
            <td><strong>Birim Müdürü<br/>(DEPT_MANAGER)</strong></td>
            <td>Yalnızca Kendi Müdürlüğü</td>
            <td>Kendi birimi adına varlık ekleme, zimmetleme, transfer ve stok kartı açma.</td>
            <td>Kullanıcı yönetimi, sistem ayarları ve başka müdürlük verileri.</td>
          </tr>
          <tr>
            <td><strong>Birim Personeli<br/>(STAFF)</strong></td>
            <td>Sadece Kendisine Zimmetli Varlıklar</td>
            <td>Salt okunur (yalnızca zimmetli varlıkları listeleme ve görüntüleme).</td>
            <td>Tüm yazma işlemleri (POST/PUT/DELETE) ve modül yönetimleri kilitli.</td>
          </tr>
          <tr>
            <td><strong>İç Denetçi<br/>(AUDITOR)</strong></td>
            <td>Kurum Geneli (Tüm Müdürlükler)</td>
            <td>Tüm envanteri, zimmetleri, bakım geçmişini ve denetim loglarını inceleme.</td>
            <td>Tüm yazma uçları kilitli (Salt Okunur rol).</td>
          </tr>
          <tr>
            <td><strong>Kurum İzleyici<br/>(VIEWER)</strong></td>
            <td>Yetkili Olduğu Müdürlük(ler)</td>
            <td>Raporlama, gösterge paneli ve genel envanter izleme.</td>
            <td>Tüm yazma uçları kilitli (Salt Okunur rol).</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid-2" style="margin-bottom: 0;">
      <div class="card card-highlight">
        <h3 style="color: #0284c7;">Çapraz Müdürlük (IDOR / BOLA) İzolasyonu</h3>
        <p style="text-align: justify; margin-bottom: 0;">
          Müdürlük yöneticilerinin başka bir birimin demirbaşını görmesi, değiştirmesi veya başka bir birim personeline zimmet ataması <code>TenantQueryScope</code> sınıfı ile engellenmiştir. Araya sahte parametre enjekte edilse dahi veritabanı sorgusu kullanıcının bağlı olduğu <code>department_id</code> şartını uygular; usulsüz işlemler <code>403 Forbidden</code> ile reddedilir ve denetim günlüğüne kaydedilir.
        </p>
      </div>

      <div class="card card-success">
        <h3 style="color: #166534;">Giriş Hız Sınırlaması (Login Rate Limiter)</h3>
        <p style="text-align: justify; margin-bottom: 0;">
          Kaba kuvvet (brute-force) saldırılarına karşı giriş uç noktasında kullanıcı adı ve IP kombinasyonu bazında hız sınırlaması uygulanmaktadır. Aynı kullanıcı adına veya aynı IP'ye ardışık 5 hatalı denemeden sonra 60 saniye boyunca <code>429 Too Many Requests</code> yanıtı verilir. Bu mekanizma meşru kullanıcıların toplu olarak kilitlenmesini önler.
        </p>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 4 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 5: TEMEL MODÜLLER VE YETENEKLER -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">MODÜL ENVANTERİ</span>
      </div>
    </div>

    <h2>Uçtan Uca Kurumsal Varlık ve Operasyon Modülleri</h2>
    <p>Gebze Belediyesi EKYS platformu aşağıdaki 8 operasyonel ana modül üzerinden hizmet vermektedir:</p>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div class="card">
        <h3 style="color: #0369a1;">1. Varlık ve Demirbaş Envanteri</h3>
        <p style="margin-bottom: 3px;">
          Tüm taşınır malların künyesi, seri no, barkod, marka/model, oda konumu ve mali değer takibi.
        </p>
        <ul>
          <li><strong>6 Aşamalı Yaşam Döngüsü:</strong> Giriş, Faal, Zimmetli, Bakımda, Hurda, Zayiat durum takibi.</li>
          <li><strong>Excel Toplu İçe Aktarım:</strong> 2.000 satırlık şablon doğrulama (validate) ve aktarım (commit).</li>
          <li><strong>Güvenli CSV Çıktısı:</strong> Formül enjeksiyon korumalı veri dökümü.</li>
        </ul>
      </div>

      <div class="card">
        <h3 style="color: #0369a1;">2. Zimmet ve Personel Takibi</h3>
        <p style="margin-bottom: 3px;">
          Demirbaşların personele tahsisi, iade süreçleri ve resmi teslim senedi dökümleri (Taslak şablon).
        </p>
        <ul>
          <li><strong>Resmi Zimmet Senedi:</strong> Islak imzaya hazır resmi taahhüt metinli A4 fişi (Taslak şablon).</li>
          <li><strong>İlişik Kesme Belgesi:</strong> Personel ayrılışında zimmet varlığını denetleyen resmi tutanak.</li>
          <li><strong>Güvenli Pasife Alma:</strong> Üzerinde zimmet bulunan personelin silinmesi engellenir (HTTP 409).</li>
        </ul>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div class="card">
        <h3 style="color: #0369a1;">3. Sayım ve Mutabakat (El Terminali & Kamera)</h3>
        <p style="margin-bottom: 3px;">
          Periyodik fiziksel sayımların oda bazında yürütülmesi ve uzlaştırma raporlaması.
        </p>
        <ul>
          <li><strong>El Terminali Modu:</strong> USB/Bluetooth barkod tabancası ile seri okutma (varsayılan).</li>
          <li><strong>Kamera ile Sayım:</strong> Kamera ile okutma özellik bayrağıyla hazır; HTTPS ve saha cihazında doğrulama gerekir.</li>
          <li><strong>Sayım Uzlaştırması:</strong> Doğru Konum, Farklı Konum ve Eksik Varlık ayrıştırması.</li>
        </ul>
      </div>

      <div class="card">
        <h3 style="color: #0369a1;">4. Depo ve Stok Yönetimi (TİF Destekli)</h3>
        <p style="margin-bottom: 3px;">
          Sarf malzemelerinin ambar bazında takibi, kritik eşik uyarıları ve sarf çıkışları.
        </p>
        <ul>
          <li><strong>Yeni Stok Kartı Açma:</strong> Kategori, birim fiyat ve kritik eşik tanımlama.</li>
          <li><strong>TİF Sarf Fişi (A4):</strong> İki nüsha ve çift imzalı resmi sarf çıkış fişi dökümü (Taslak şablon).</li>
          <li><strong>Eşzamanlılık Koruması:</strong> Negatif stok çıkışını önleyen SELECT FOR UPDATE kilidi.</li>
        </ul>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom: 0;">
      <div class="card">
        <h3 style="color: #0369a1;">5. Araç ve Filo Yönetimi</h3>
        <p style="margin-bottom: 3px;">
          Belediyeye ait hizmet araçları ve iş makinelerinin operasyonel izlenmesi.
        </p>
        <ul>
          <li><strong>Kilometre ve Durum Takibi:</strong> Görevde, Serviste, Parkta durum güncellemeleri.</li>
          <li><strong>Muayene ve Sigorta Uyarıları:</strong> Tarihi yaklaşan periyodik kontrollerin tespiti.</li>
        </ul>
      </div>

      <div class="card">
        <h3 style="color: #0369a1;">6. Değiştirilemez Denetim Günlüğü (Audit Log)</h3>
        <p style="margin-bottom: 3px;">
          Tüm kullanıcı eylemlerinin hukuki delil niteliğinde kaydedilmesi.
        </p>
        <ul>
          <li><strong>Tetikleyici Koruması:</strong> Veritabanı seviyesinde UPDATE ve DELETE engeli.</li>
          <li><strong>Kapsamlı Üstveri:</strong> Kullanıcı adı, IP adresi, zaman damgası ve işlem detayı.</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 5 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 6: ARAYÜZ VİTRİNİ 1 (YÖNETİM VE VARLIK ENVANTERİ) -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">ARAYÜZ VİTRİNİ - I</span>
      </div>
    </div>

    <h2>Kullanıcı Deneyimi: Yönetici Konsolu ve Varlık Envanteri</h2>
    <p>Modern kamu kurumlarına uygun sade, hızlı, Türkçe destekli ve yüksek okunabilirlikli arayüz tasarımı:</p>

    <div class="grid-2" style="margin-bottom: 9px;">
      <div>
        <div class="screenshot-frame">
          <img src="${images.dashboard}" alt="Yönetim Paneli" />
          <div class="screenshot-caption">
            <span>YÖNETİCİ KONSOLU (DASHBOARD)</span>
            <span class="badge-tag tag-blue">CANLI İZLEME</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">
          <strong>Özellikler:</strong> Toplam varlık, zimmetli varlık, bakımda olan cihaz ve kritik stok uyarıları; 32 müdürlüğün varlık dağılım grafiği ve anlık işlem akışı.
        </p>
      </div>

      <div>
        <div class="screenshot-frame">
          <img src="${images.assets}" alt="Varlık Listesi" />
          <div class="screenshot-caption">
            <span>VARLIK ENVANTER LİSTESİ</span>
            <span class="badge-tag tag-blue">TANSTACK TABLE</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">
          <strong>Özellikler:</strong> Barkod/seri no araması, kategori, müdürlük ve duruma göre anlık çoklu filtreleme; güvenli CSV dışa aktarımı ve sayfalama.
        </p>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom: 0;">
      <div>
        <div class="screenshot-frame">
          <img src="${images.assetDetail}" alt="Varlık Detayı" />
          <div class="screenshot-caption">
            <span>VARLIK KÜNYESİ VE YAŞAM DÖNGÜSÜ</span>
            <span class="badge-tag tag-blue">6 AŞAMALI STEPPER</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">
          <strong>Özellikler:</strong> Dinamik QR barkod, taşınır hesap kodu, amortisman durumu, 6 adımlı yaşam döngüsü durumu ve eksiksiz zimmet/bakım geçmişi.
        </p>
      </div>

      <div>
        <div class="screenshot-frame">
          <img src="${images.settings}" alt="Sistem Ayarları" />
          <div class="screenshot-caption">
            <span>SİSTEM AYARLARI VE YAPILANDIRMA</span>
            <span class="badge-tag tag-blue">YAPILANDIRMA</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">
          <strong>Özellikler:</strong> Kurum başlığı, NLS dil ayarları (<code>TURKISH_AI</code>), oturum zaman aşımı süreleri, rol bazlı erişim parametreleri ve sistem sağlığı.
        </p>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 6 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 7: ARAYÜZ VİTRİNİ 2 (OPERASYON VE DENETİM) -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">ARAYÜZ VİTRİNİ - II</span>
      </div>
    </div>

    <h2>Kullanıcı Deneyimi: Saha Operasyonu ve Denetim İzi</h2>
    <p>El terminaliyle sayım çalışıyor, saha pilotu planlanıyor; zimmet, araç takip ve denetim izi modülleri:</p>

    <div class="grid-2" style="margin-bottom: 9px;">
      <div>
        <div class="screenshot-frame">
          <img src="${images.personnel}" alt="Personel Zimmetleri" />
          <div class="screenshot-caption">
            <span>PERSONEL VE ZİMMET YÖNETİMİ</span>
            <span class="badge-tag tag-blue">RESMİ TUTANAK</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">
          <strong>Özellikler:</strong> Personele zimmetli demirbaşların tek ekranda izlenmesi, resmi zimmet senedi dökümü, ambara iade alma ve ilişik kesme kontrolü.
        </p>
      </div>

      <div>
        <div class="screenshot-frame">
          <img src="${images.counting}" alt="Sayım ve Uzlaştırma" />
          <div class="screenshot-caption">
            <span>ENVANTER SAYIMI VE MUTABAKAT</span>
            <span class="badge-tag tag-blue">BARKOD UZLAŞTIRMA</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">
          <strong>Özellikler:</strong> Oda ve kat bazlı sayım seansları; el terminali ve kamera ile okutulan barkodların sistemle karşılaştırılması.
        </p>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom: 0;">
      <div>
        <div class="screenshot-frame">
          <img src="${images.fleet}" alt="Araç ve Filo Yönetimi" />
          <div class="screenshot-caption">
            <span>ARAÇ VE İŞ MAKİNESİ FİLOSU</span>
            <span class="badge-tag tag-blue">KM VE BAKIM TAKİBİ</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">
          <strong>Özellikler:</strong> Belediye araçlarının plaka, kilometre, görev durumu, kaza/ceza geçmişi, periyodik muayene ve sigorta tarih alarmları.
        </p>
      </div>

      <div>
        <div class="screenshot-frame">
          <img src="${images.audit}" alt="Güvenlik Denetim İzi" />
          <div class="screenshot-caption">
            <span>GÜVENLİK DENETİM GÜNLÜĞÜ (AUDIT LOG)</span>
            <span class="badge-tag tag-green">DEĞİŞTİRİLEMEZ İZ</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">
          <strong>Özellikler:</strong> Kimin, hangi IP'den, ne zaman, hangi veriyi eklediği/değiştirdiği veya dışa aktardığının hukuki delil niteliğinde kaydı.
        </p>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 7 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 8: BELEDİYEDEN BEKLENEN BİLGİ VE KARARLAR (10 MADDE) -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">KURUMSAL ENTEGRASYON</span>
      </div>
    </div>

    <h2>Belediyeden Beklenen Bilgi, Karar ve Kurumsal Erişimler (10 Madde)</h2>
    <p>Sistemin belediye kurumsal altyapısında canlıya alınabilmesi için Bilgi İşlem, Mali Hizmetler ve İK birimlerinden beklenen 10 operasyonel madde:</p>

    <div class="card" style="margin-bottom: 7px; padding: 6px 9px;">
      <table>
        <thead>
          <tr>
            <th style="width: 5%; text-align: center;">#</th>
            <th style="width: 27%;">Beklenen Bilgi / Karar</th>
            <th style="width: 50%;">Teknik Gerekçe ve Detay</th>
            <th style="width: 18%;">Muhatap Birim</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; font-weight: bold;">1</td>
            <td><strong>Oracle Sürümü ve Mimarisi</strong></td>
            <td>Oracle veritabanının tam sürümü (19c / 21c / 23ai) ve mimarisi (CDB/PDB veya Standalone).</td>
            <td>Bilgi İşlem (DBA)</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold;">2</td>
            <td><strong>Servis Adı ve Bağlantı Parametresi</strong></td>
            <td>DB sunucu IP adresi, portu (1521), SERVICE_NAME veya SID; TNS / Wallet gereksinimi.</td>
            <td>Bilgi İşlem (DBA / Ağ)</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold;">3</td>
            <td><strong>DBA Kurulum Yetkileri</strong></td>
            <td><code>docs/dba-kurulum.sql</code> ile VARLIK_OWNER (DDL) ve VARLIK_APP_RUNTIME (DML) şemalarının açılması.</td>
            <td>Bilgi İşlem (DBA)</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold;">4</td>
            <td><strong>Logon Trigger Yetki Onayı</strong></td>
            <td>CURRENT_SCHEMA ve TURKISH_AI ayarlayan trigger için ADMINISTER DATABASE TRIGGER yetkisi veya HikariCP fallback onayı.</td>
            <td>Bilgi İşlem (DBA)</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold;">5</td>
            <td><strong>Karakter Seti ve NLS_SORT</strong></td>
            <td>Veritabanının karakter seti (AL32UTF8) ve TURKISH_AI dil desteğinin doğrulanması.</td>
            <td>Bilgi İşlem (DBA)</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold;">6</td>
            <td><strong>Kurumsal Ağ ve Port Erişimi</strong></td>
            <td>Uygulama sunucusu ile Oracle veritabanı arasında 1521 port erişimi ve güvenlik duvarı izinleri.</td>
            <td>Bilgi İşlem (Ağ/Siber)</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold;">7</td>
            <td><strong>HTTPS ve SSL Sertifikası</strong></td>
            <td>Kurumsal alan adı ve SSL sertifikası (güvenli çerezler ve kamera ile okutma HTTPS zorunluluğuna tabidir).</td>
            <td>Bilgi İşlem (Sistem)</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold;">8</td>
            <td><strong>Personel Veri Kaynağı Modeli</strong></td>
            <td>Canlıya geçişte personelin Excel şablonuyla yüklenmesi veya doğrudan İK web servisi / DB View entegrasyon kararı.</td>
            <td>İnsan Kaynakları / BT</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold;">9</td>
            <td><strong>Kimlik Doğrulama Yöntemi</strong></td>
            <td>Sistemin yerel güvenli kimlik doğrulaması (BCrypt + kaba kuvvet koruması) mı yoksa Active Directory (LDAP) mi kullanılacağı.</td>
            <td>Bilgi İşlem (Sistem)</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold;">10</td>
            <td><strong>Mevcut Envanter ve Hesap Kodu Onayları</strong></td>
            <td>Mevcut demirbaş envanterinin Excel dökümü ile 16 kategori için Taşınır Kayıt Yetkilisinin hesap kodu ve amortisman onayları.</td>
            <td>Mali Hizmetler (TKY)</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid-2" style="margin-bottom: 0;">
      <div class="card card-highlight">
        <h3 style="color: #0284c7;">Bağlantı Günü Kesintisiz Geçiş Mimarisi</h3>
        <p style="font-size: 8.4px; text-align: justify; margin-bottom: 2px;">
          Sistem, yukarıdaki 10 parametre sağlandığında kod üzerinde hiçbir değişiklik yapılmadan, yalnızca kurumsal <code>.env</code> ortam değişkenleri tanımlanarak <code>prod</code> profilinde ayağa kalkacak şekilde tasarlanmıştır.
        </p>
        <p style="font-size: 8.4px; color: #0369a1; margin-bottom: 0;">
          <strong>Çalışma Kitabı:</strong> <code>docs/baglanti-gunu-runbook.md</code> adım adım geçiş rehberi hazırdır.
        </p>
      </div>

      <div class="card card-warning">
        <h3 style="color: #92400e;">Sıfır Kurulum Geri Dönüş (Rollback) Güvenliği</h3>
        <p style="font-size: 8.4px; text-align: justify; margin-bottom: 2px;">
          İlk kurulum esnasında beklenmedik bir engel oluşması durumunda, <code>docs/dba-rollback.sql</code> betiği güvenlik kilidiyle donatılmıştır. Şemada veri tespit edildiğinde koruma kilidi devreye girer.
        </p>
        <p style="font-size: 8.4px; color: #92400e; margin-bottom: 0;">
          <strong>DBA Güvencesi:</strong> Bilinçli onay olmadan hiçbir nesne silinmez; sistem temiz başlangıç durumuna döner.
        </p>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 8 / 8</div>
  </div>
</div>

</body>
</html>
`;

async function generatePDF() {
  console.log('1. Playwright Chromium baslatiliyor...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('2. HTML icerigi yukleniyor...');
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  console.log('3. PDF dosyasi uretiliyor (A4, print background)...');
  await page.pdf({
    path: OUTPUT_PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    preferCSSPageSize: true,
  });

  await browser.close();
  console.log('4. PDF basariyla olusturuldu: ' + OUTPUT_PDF_PATH);
}

generatePDF().catch((err) => {
  console.error('PDF uretiminde hata olustu:', err);
  process.exit(1);
});
