/**
 * scripts/generate_executive_report_pdf.js
 * Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)
 * Yönetici Sunum Raporu (PDF) Üretici
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/@playwright/test'));

const OUTPUT_PDF_PATH = path.resolve(__dirname, '../docs/Gebze_Varlik_Yonetimi_Yonetici_Raporu.pdf');

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
    settings: getBase64Image('docs/screenshots/08-settings.png')
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
    padding: 14mm 16mm 14mm 16mm;
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
    padding-bottom: 8px;
    margin-bottom: 12px;
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
    font-size: 10px;
    color: #64748b;
    font-weight: 600;
  }
  .header-right .badge {
    background: #0284c7;
    color: #ffffff;
    font-size: 9px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .page-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    margin-top: 8px;
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
  h1 { font-size: 19px; font-weight: 800; color: #0f172a; margin-bottom: 5px; line-height: 1.2; }
  h2 { font-size: 13.5px; font-weight: 700; color: #0369a1; margin-bottom: 6px; }
  h3 { font-size: 11.5px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  p { font-size: 9.5px; line-height: 1.45; color: #334155; margin-bottom: 6px; }

  /* Cards & Containers */
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 8px;
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

  /* Grid Layouts */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }

  /* KPI Box */
  .kpi-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
    text-align: center;
  }
  .kpi-val { font-size: 15px; font-weight: 800; color: #0369a1; }
  .kpi-label { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 2px; }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5px;
    margin-bottom: 6px;
  }
  th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 4px 6px;
    border: 1px solid #0f172a;
  }
  td {
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    color: #1e293b;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #f8fafc; }
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

  /* Image Container */
  .screenshot-frame {
    border: 1px solid #cbd5e1;
    border-radius: 5px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    background: #ffffff;
    margin-bottom: 4px;
    display: flex;
    flex-direction: column;
  }
  .screenshot-frame img {
    width: 100%;
    height: 175px;
    object-fit: cover;
    object-position: top;
    display: block;
  }
  .screenshot-caption {
    font-size: 8px;
    font-weight: 700;
    color: #475569;
    padding: 3px 6px;
    background: #f1f5f9;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* List styles */
  ul { margin-left: 14px; margin-bottom: 6px; }
  li { font-size: 9px; line-height: 1.4; color: #334155; margin-bottom: 2px; }
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

    <div style="margin-bottom: 12px; text-align: center; padding: 10px 0; background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; border-radius: 6px;">
      <h1 style="color: #ffffff; font-size: 18px; margin-bottom: 3px;">GEBZE BELEDİYESİ VARLIK YÖNETİMİ SİSTEMİ: YÖNETİCİ SUNUM RAPORU</h1>
      <div style="font-size: 10px; color: #93c5fd; font-weight: 600;">Sistem Durum Analizi, Güvenlik Doğrulaması ve Entegrasyon Hazırlık Durumu</div>
      <div style="font-size: 8.5px; color: #cbd5e1; margin-top: 3px;">Belediye Oracle Veritabanı ve İK Entegrasyon Süreci Ön Değerlendirmesi</div>
    </div>

    <div class="grid-4" style="margin-bottom: 10px;">
      <div class="kpi-box">
        <div class="kpi-val" style="color: #0284c7;">Büyük Ölçüde Hazır</div>
        <div class="kpi-label">Teknik Altyapı Durumu</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #16a34a;">528 / 528</div>
        <div class="kpi-label">Güvenlik Testi Geçti</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #6366f1;">51 / 51</div>
        <div class="kpi-label">Playwright E2E Doğrulandı</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #0f172a;">19c / 21c / 23ai</div>
        <div class="kpi-label">Oracle Uyumlu Tasarım</div>
      </div>
    </div>

    <div class="card card-highlight">
      <h2 style="font-size: 11.5px; margin-bottom: 4px;">Yönetici Özeti ve Mevcut Durum</h2>
      <p style="font-size: 9.3px; text-align: justify; margin-bottom: 4px;">
        Gebze Belediyesi bünyesinde yer alan tüm taşınır malların, araç ve iş makinelerinin, demirbaşların, sarf malzemelerinin ve bilişim donanımlarının tek bir merkezi platformdan yönetilmesi, sayılması, zimmetlenmesi ve denetlenmesi amacıyla geliştirilen <strong>Kurumsal Varlık Yönetimi Sistemi (EKYS)</strong>, teknik olarak büyük ölçüde hazır durumdadır.
      </p>
      <p style="font-size: 9.3px; text-align: justify; margin-bottom: 0;">
        Sistem; bağlantı günü kod değişikliği gerekmeden, yalnızca kurumsal ortam değişkenleri (<code>.env</code>) ve yapılandırma ile çalıştırılacak mimaride kurulmuştur. Canlıya geçiş öncesinde yaklaşık 4 iş günü efor gerektiren kalan P1 işleri (stok kartı açma modalı, TİF sarf fişi dökümü, resmi zimmet fişi A4 çıktısı ve giriş uç noktasında IP bazlı hız sınırlaması) ile belediyeden beklenen teknik parametreler ve erişim izinleri bulunmaktadır.
      </p>
    </div>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div class="card" style="margin-bottom: 0;">
        <h3 style="color: #0369a1;">Tamamlanan ve Doğrulanan Çekirdek Özellikler</h3>
        <ul>
          <li><strong>Gelişmiş Modül Kapsamı:</strong> Varlık Envanteri, Zimmet/Tutanak, Depo/Stok, Bakım/İş Emri, Araç/Filo, Satın Alma, Sayım ve Güvenlik Denetim İzi.</li>
          <li><strong>Çapraz Müdürlük İzolasyonu:</strong> Fen İşleri vb. 30 müdürlüğün yetkilileri yalnızca kendi biriminin envanterini görebilmekte; başkasının verisine erişememektedir (BOLA/IDOR koruması).</li>
          <li><strong>Resmi Hiyerarşi & Kurumsal Ağaç:</strong> 30 Müdürlük, 5 Ana Bina, Katlar ve 128 Oda eksiksiz şemalandırılmıştır.</li>
          <li><strong>Personel & Zimmet Bütünlüğü:</strong> Sicil numaralı personel yönetimi, zimmette zorunlu personel eşleşmesi ve aktif zimmeti olan personelin silinememesi güvencesi.</li>
        </ul>
      </div>

      <div class="card" style="margin-bottom: 0;">
        <h3 style="color: #0369a1;">Sistem Güvenliği ve Sertleştirme</h3>
        <ul>
          <li><strong>En Az Yetkili Veritabanı Kullanıcısı:</strong> Tabloları kuran DDL kullanıcısı (<code>VARLIK_OWNER</code>) ile uygulamanın çalıştığı sadece DML yetkili (<code>VARLIK_APP_RUNTIME</code>) ayrılmıştır.</li>
          <li><strong>Değiştirilemez Denetim Günlüğü:</strong> Güvenlik denetim izi tablosunda (<code>system_audit_logs</code>) silme ve güncelleme veritabanı seviyesinde fiziksel olarak engellenmiştir.</li>
          <li><strong>Eşzamanlı Stok Koruması:</strong> İki memur aynı anda son stok kalemini çıkmaya çalıştığında satır kilidi (<code>FOR UPDATE</code>) devreye girer; stok asla negatife düşemez.</li>
          <li><strong>CSV Formül Enjeksiyonu Koruması:</strong> Excel dışa aktarımlarında formül suistimali (DDE saldırısı) karakter filtreleriyle tamamen engellenmiştir.</li>
        </ul>
      </div>
    </div>

    <div class="card card-warning" style="margin-bottom: 0;">
      <h3 style="color: #92400e; font-size: 10.5px; margin-bottom: 3px;">Kalan İhtiyaçlar ve Entegrasyon Ön Koşulları</h3>
      <p style="font-size: 8.8px; margin-bottom: 0;">
        Sistem; Oracle 19c, 21c ve 23ai sürümlerinde çalışabilecek üretim migrasyon paketi (<code>db/migration-prod</code>) ile tasarlanmıştır. Belediye Bilgi İşlem ekibinden gerekli teknik bilgiler, test şeması ve ağ erişimi sağlandığında kuru prova icra edilecek ve kalan 4 iş günlük P1 geliştirmeleriyle canlıya geçiş tamamlanacaktır.
      </p>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 1 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 2: BELEDİYEDEN BİLGİLER GELDİĞİNDE YAPILACAKLAR -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">EYLEM VE KARAR PLANI</span>
      </div>
    </div>

    <h2>Belediyeden Bilgiler Geldiğinde Yapılacaklar ve Karar Başlıkları</h2>
    <p>Bağlantı ve entegrasyon süreci belediyeden gelecek teknik bilgilere ve erişim izinlerine bağlı olup, adımlar sıra ve bağımlılık esasına göre planlanmıştır:</p>

    <div class="card" style="margin-bottom: 8px;">
      <h3 style="color: #0f172a;">Sıra ve Bağımlılık Esaslı Eylem Planı</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 18%;">Aşama</th>
            <th style="width: 32%;">Uygulanacak İşlem ve Kapsam</th>
            <th style="width: 25%;">Ön Koşul & Bağımlılık</th>
            <th style="width: 25%;">Beklenen Çıktı</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Ön Koşul: Belediye Bilgi Paylaşımı</strong></td>
            <td><code>docs/belediye-bt-sorulari.md</code> listesindeki ağ erişimi, Oracle sürüm bilgisi ve test şemasının tahsis edilmesi.</td>
            <td>Bilgi İşlem Müdürlüğü,<br>DBA Yetkilisi</td>
            <td>Bağlantı parametreleri ve test şeması hazır.</td>
          </tr>
          <tr>
            <td><strong>1. Aşama: 19c Kuru Prova</strong></td>
            <td>Belediyenin açtığı test şemasında <code>docs/kuru-prova-19c.sql</code> betiği çalıştırılarak DDL, JSON ve NLS uyumunun test edilmesi.</td>
            <td>Test şeması erişimi</td>
            <td>19c şemasında sıfır hata doğrulama raporu.</td>
          </tr>
          <tr>
            <td><strong>2. Aşama: Kalan P1 İşleri ve Veri</strong></td>
            <td>Yaklaşık 4 iş günlük P1 geliştirmelerinin tamamlanması; İK personel ve taşınır Excel listelerinin konsolide edilmesi.</td>
            <td>Proje Ekibi,<br>Mali Hizmetler & İK</td>
            <td>TİF/Zimmet modalları hazır, doğrulanmış Excel şablonu.</td>
          </tr>
          <tr>
            <td><strong>3. Aşama: Pilot Sayım ve Eğitim</strong></td>
            <td>Fen İşleri ve Temizlik İşleri ambarlarında el terminaliyle pilot sayım yapılması; taşınır yetkililerine zimmet eğitimi verilmesi.</td>
            <td>Müdürlük Taşınır Yetkilileri,<br>Ambar Görevlileri</td>
            <td>Pilot sayım mutabakatı ve kullanıcı onayı.</td>
          </tr>
          <tr>
            <td><strong>4. Aşama: Canlıya Geçiş (Go-Live)</strong></td>
            <td>Kurumsal Oracle veritabanına bağlanılması, prod şemanın kurulması, kullanıcı şifrelerinin tanımlanması ve sistemin açılması.</td>
            <td>Tüm İlgili Birimler</td>
            <td><strong>Sistem Canlı Kullanımda</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card card-warning" style="margin-bottom: 8px;">
      <h3 style="color: #92400e; font-size: 11px;">Kurumsal Karar Bekleyen 3 Temel Başlık</h3>
      <div style="font-size: 8.8px; line-height: 1.4; color: #78350f;">
        <p style="margin-bottom: 4px;"><strong>1. Sayım Donanımı Tercihi (S.8):</strong> Mevcut durumda USB/Bluetooth barkod okuyucu el terminalleri ve klavye emülasyonu <strong>%100 çalışmaktadır</strong>. Sahada ek kamera tabanlı mobil okutma istenirse HTTPS sertifikasyonu zorunludur. <em>Tavsiyemiz:</em> Canlıya mevcut el terminalleriyle başlanması; mobil kamera özelliğinin ikinci aşamada devreye alınmasıdır.</p>
        <p style="margin-bottom: 4px;"><strong>2. Personel Verisi Akışı (S.1):</strong> İK sisteminden otomatik doğrudan veri servisi sağlanana dek, hazırladığımız Excel İçe Aktarım servisi (<code>PersonnelImportService</code>) ile sicil bazlı toplu güncelleme sağlanmaktadır. <em>Tavsiyemiz:</em> Canlıya Excel aktarımıyla başlanması, erişim açıldığında İK veri tabanı görünümüne (View) bağlanılmasıdır.</p>
        <p style="margin-bottom: 0;"><strong>3. Kimlik Doğrulama / Giriş Yöntemi (S.2):</strong> Sistemde zorunlu ilk şifre değişimi ve kaba kuvvet kilitli yerel kullanıcı yönetimi aktiftir. Kurumsal Active Directory / LDAP istendiğinde mimari buna hazır tutulmuştur. <em>Tavsiyemiz:</em> İlk etapta yerel şifre politikasıyla başlanmasıdır.</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 0;">
      <h3 style="color: #0369a1;">Belediye Bilgi İşlem ve İlgili Birimlerden Beklenen Bilgi ve Erişimler</h3>
      <div class="grid-2">
        <ul style="margin-bottom: 0;">
          <li><strong>1. Oracle 19c Test Şeması:</strong> Kuru prova betiğimizin çalıştırılacağı geçici bir test şeması (örn: <code>VARLIK_TEST_DRYRUN</code>).</li>
          <li><strong>2. Güvenlik Duvarı İzni:</strong> Uygulama sunucusundan Oracle sunucusuna <code>1521</code> port erişimi.</li>
          <li><strong>3. Bağlantı Parametreleri:</strong> Service Name, IP adresi ve karakter seti (<code>AL32UTF8</code>) bilgisi.</li>
        </ul>
        <ul style="margin-bottom: 0;">
          <li><strong>4. Güncel İK Personel Excel'i:</strong> Sicil No, Ad Soyad, Unvan, E-posta ve Müdürlük içeren personel dökümü.</li>
          <li><strong>5. Pilot Birim Taşınır Sorumluları:</strong> Pilot denemeyi yürütecek ambar sorumluları.</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 2 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 3: MİMARİ VE TEKNOLOJİ MATRİSİ -->
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

    <h2>Teknoloji Yığını ve Mimari Prensipler</h2>
    <p>Uygulama; kurumsal kararlılık, yüksek eşzamanlı kullanıcı performansı ve yapılandırma odaklı işletim ilkeleriyle inşa edilmiştir.</p>

    <div class="card" style="margin-bottom: 8px;">
      <h3 style="color: #0f172a;">Doğrulanmış Teknoloji ve Kütüphane Sürümleri</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">Katman</th>
            <th style="width: 28%;">Bileşen / Kütüphane</th>
            <th style="width: 18%;">Sürüm</th>
            <th style="width: 32%;">Mimari Görevi & Fonksiyonu</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Çalışma Zamanı</strong></td>
            <td>Java SE Development Kit</td>
            <td><code>Java 25 (LTS)</code></td>
            <td>Yüksek başarımlı sunucu altyapısı ve sanal iş parçacıkları (Virtual Threads).</td>
          </tr>
          <tr>
            <td><strong>Kurumsal Çatı</strong></td>
            <td>Spring Boot (WebMVC)</td>
            <td><code>4.1.2</code></td>
            <td>RESTful mikro mimari, dependency injection ve statik SPA sunumu.</td>
          </tr>
          <tr>
            <td><strong>Veri Tabanı Katmanı</strong></td>
            <td>Hibernate ORM / HikariCP</td>
            <td><code>7.4 / 7.0</code></td>
            <td>Yüksek performanslı bağlantı havuzu, 2. seviye önbellek ve veri haritalama.</td>
          </tr>
          <tr>
            <td><strong>Şema Göç Motoru</strong></td>
            <td>Flyway Migration</td>
            <td><code>12.4.0</code></td>
            <td>Sürüm kontrollü, otomatik DDL doğrulama ve şema geçmiş takibi.</td>
          </tr>
          <tr>
            <td><strong>Oracle Sürücüsü</strong></td>
            <td>Oracle JDBC (ojdbc17 / orai18n)</td>
            <td><code>23.26.3.0.0</code></td>
            <td>Oracle 19c-23ai uyumlu JDBC sürücüsü ve yerel Türkçe karakter desteği.</td>
          </tr>
          <tr>
            <td><strong>Ofis Entegrasyonu</strong></td>
            <td>Apache POI (poi-ooxml)</td>
            <td><code>5.2.5</code></td>
            <td>Büyük boyutlu Excel (.xlsx) şablon okuma ve formül korumalı dışa aktarım.</td>
          </tr>
          <tr>
            <td><strong>Kullanıcı Arayüzü</strong></td>
            <td>React / Vite / TypeScript</td>
            <td><code>18.3.1 / 6.2.0</code></td>
            <td>Tür güvenli, hızlı Single Page Application (SPA) reaktif bileşen çatısı.</td>
          </tr>
          <tr>
            <td><strong>Veri Tabloları</strong></td>
            <td>TanStack React Table / Query</td>
            <td><code>8.21.2 / 5.66.9</code></td>
            <td>Büyük veri setlerini dondurmadan filtreleyen, sıralayan sanal veri motoru.</td>
          </tr>
          <tr>
            <td><strong>Stil & Tasarım</strong></td>
            <td>Tailwind CSS / Lucide Icons</td>
            <td><code>3.4.17 / 0.475.0</code></td>
            <td>Mobil ve tablet uyumlu (Responsive), kurumsal ve modern tasarım dili.</td>
          </tr>
          <tr>
            <td><strong>Test Otomasyonu</strong></td>
            <td>Playwright / Vitest / Node</td>
            <td><code>1.50.1 / 3.0.7 / 24.21</code></td>
            <td>Uçtan uca E2E tarayıcı otomasyonu, regresyon ve güvenlik test paketi.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div class="card" style="margin-bottom: 0;">
        <h3 style="color: #0369a1;">12-Factor Kurumsal Yapılandırma Modeli</h3>
        <p>Uygulama kodu içerisinde hiçbir sunucu IP adresi, port, kullanıcı adı veya şifre <strong>bulunmaz</strong>. Tüm yapılandırma işletim sistemi ortam değişkenleri veya <code>.env</code> dosyasından okunur.</p>
        <ul>
          <li><strong>Bağlantı Parametreleri:</strong> Service Name (<code>DB_SERVICE</code>), SID veya TNS Alias desteklenir.</li>
          <li><strong>TLS / Oracle Wallet:</strong> <code>ORACLE_NET_TNS_ADMIN</code> parametresi ile mTLS desteklenir.</li>
          <li><strong>HikariCP Havuzu:</strong> Maksimum bağlantı, keep-alive ve idle-timeout değişkenlerle yönetilir.</li>
        </ul>
      </div>

      <div class="card" style="margin-bottom: 0;">
        <h3 style="color: #0369a1;">Türkçe Karakter ve NLS Mimarisi</h3>
        <p>Türkçe harf duyarsız aramalar (<code>İ/i</code>, <code>I/ı</code>, <code>Ş/ş</code>, <code>Ğ/ğ</code>, <code>Ü/ü</code>, <code>Ö/ö</code>, <code>Ç/ç</code>) oturum başlangıcında ve sorgu seviyesinde garanti altına alınmıştır.</p>
        <ul>
          <li><strong>Oturum Parametresi:</strong> <code>NLS_COMP=LINGUISTIC</code> ve <code>NLS_SORT=TURKISH_AI</code> tetikleyicisi.</li>
          <li><strong>Fonksiyonel İndeksler:</strong> Kritik arama alanlarında <code>NLSSORT(..., 'TURKISH_AI')</code> indeksleri.</li>
          <li><strong>Karakter Uzunluğu:</strong> Tüm sütunlar <code>VARCHAR2(n CHAR)</code> semantiğiyle tanımlıdır.</li>
        </ul>
      </div>
    </div>

    <div class="card card-highlight" style="margin-bottom: 0;">
      <h3 style="color: #0369a1; font-size: 11px;">Günlük Yönetimi ve Log Rotasyonu</h3>
      <p style="font-size: 8.8px; margin-bottom: 0;">
        <code>logback-spring.xml</code> yapılandırması ile sistem logları 10 MB'lık parçalara bölünür; 30 gün boyunca <code>.gz</code> formatında sıkıştırılarak saklanır ve toplam 2 GB kota aşıldığında en eski kayıtlar otomatik temizlenir.
      </p>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 3 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 4: ORACLE UYUMLULUK VE ŞEMA EŞDEĞERLİĞİ -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">VERİTABANI MİMARİSİ</span>
      </div>
    </div>

    <h2>Oracle 19c/21c/23ai Uyumluluk ve Şema Eşdeğerliği</h2>
    <p>19c için hazırlandı; 23ai üzerinde sıfır şemada kuru prova yapıldı, 19c'de doğrulama belediyenin test şemasında yapılacak.</p>

    <div class="card card-success" style="margin-bottom: 8px;">
      <div class="grid-2">
        <div>
          <h3 style="color: #166534; font-size: 11.5px;">Şema Eşdeğerliği: %100 Birebir Eşit</h3>
          <p style="font-size: 8.8px; margin-bottom: 4px;">
            Geliştirme şeması (<code>V1..V17</code>) ile üretim şema paketi (<code>db/migration-prod/V1..V2</code>) arasında boş şema üzerinde çapraz eşdeğerlik testi çalıştırılmış ve tam uyum sağlanmıştır.
          </p>
          <div style="font-size: 7.8px; color: #15803d;">* Tablo sayısı: 21 uygulama tablosu + 1 Flyway şema geçmiş tablosudur.</div>
        </div>
        <div>
          <table>
            <tbody>
              <tr><td><strong>Uygulama Tablo Sayısı</strong></td><td><strong>21 Tablo</strong> (+ 1 Flyway geçmiş tablosu)</td></tr>
              <tr><td><strong>Sütun Sayısı</strong></td><td><strong>291 Sütun</strong> (%100 Eşit)</td></tr>
              <tr><td><strong>İndeks Sayısı</strong></td><td><strong>112 İndeks</strong> (%100 Eşit)</td></tr>
              <tr><td><strong>Kısıt (Constraint)</strong></td><td><strong>71 Kısıt</strong> (%100 Eşit)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 8px;">
      <h3 style="color: #0f172a;">Oracle 19c Geriye Dönük Uyumluluk Önlemleri</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 26%;">Özellik / Yapı</th>
            <th style="width: 32%;">Oracle 23ai (Yerel)</th>
            <th style="width: 42%;">19c/21c/23ai Evrensel Çözümümüz (Prod Paketi)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>JSON Veri Tipi</strong></td>
            <td>Yerel <code>JSON</code> veri tipi (21c+).</td>
            <td><code>CLOB CHECK (kolon IS JSON)</code> — 19c, 21c ve 23ai'nin tamamında yerel JSON indeksleri ve operatörleriyle sorunsuz çalışır.</td>
          </tr>
          <tr>
            <td><strong>Koşullu DDL</strong></td>
            <td><code>DROP TABLE IF EXISTS</code></td>
            <td>Standart DDL — Varlık şeması temiz kurulumda doğrudan <code>CREATE TABLE</code> ile sıfır sözdizimi hatasıyla oluşturulur.</td>
          </tr>
          <tr>
            <td><strong>Otomatik Artan ID</strong></td>
            <td><code>IDENTITY</code> sütunları.</td>
            <td>Oracle 12c R1'den bu yana tam desteklenen standart <code>GENERATED BY DEFAULT AS IDENTITY</code> yapısı kullanılmıştır.</td>
          </tr>
          <tr>
            <td><strong>İsimlendirme Sınırı</strong></td>
            <td>128 bayt tanımlayıcı.</td>
            <td>Tüm tablo, indeks ve kısıt isimleri <strong>30 karakterin altında</strong> tutularak eski sürümlerle bile tam uyumlu kılınmıştır.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div class="card" style="margin-bottom: 0;">
        <h3 style="color: #0369a1;">En Az Yetkili DBA Modeli (docs/dba-kurulum.sql)</h3>
        <p>Kurumsal belediye DBA politikalarına tam uyum için iki ayrı kullanıcı rolü tanımlanmıştır:</p>
        <ul>
          <li><strong>VARLIK_OWNER (DDL):</strong> Tablo, indeks ve dizileri oluşturan ve şemaya sahip olan DDL yetkilisi.</li>
          <li><strong>VARLIK_APP_RUNTIME (DML):</strong> Uygulamanın bağlandığı, sadece <code>SELECT, INSERT, UPDATE, DELETE</code> yetkisi olan çalışma zamanı kullanıcısı.</li>
          <li><strong>Denetim Güvencesi:</strong> <code>system_audit_logs</code> üzerinde <code>UPDATE</code> ve <code>DELETE</code> yetkisi verilmemiştir.</li>
        </ul>
      </div>

      <div class="card" style="margin-bottom: 0;">
        <h3 style="color: #0369a1;">Çift Hatlı Migrasyon Kuralı</h3>
        <p>Proje süresince şema tutarlılığını garanti etmek için <strong>Çift Hat (Dual-Track)</strong> kuralı uygulanmaktadır:</p>
        <ul>
          <li>Geliştirme hattı: <code>db/migration/V1..V17</code> (Artımlı değişiklikler).</li>
          <li>Üretim hattı: <code>db/migration-prod/V1..V2</code> (Temiz, konsolide, sıfır test verili).</li>
          <li><strong>Otomatik Denetim:</strong> <code>scripts/test_migration_equivalence.ps1</code> ile iki hattın eşitliği doğrulanmadan kod kabul edilmez.</li>
        </ul>
      </div>
    </div>

    <div class="card card-highlight" style="margin-bottom: 0;">
      <h3 style="color: #0369a1; font-size: 11px;">Doğrulama ve Kuru Prova Durumu</h3>
      <p style="font-size: 8.8px; margin-bottom: 0;">
        Üretim DDL paketi Oracle 23ai üzerinde boş şemada sıfır hata ile doğrulanmıştır. Belediye DBA'sı tarafından tahsis edilecek Oracle 19c test şemasında çalıştırılmak üzere <code>docs/kuru-prova-19c.sql</code> ve otomatik koşturucu (<code>scripts/dry_run_oracle19c.ps1</code>) hazır tutulmaktadır; canlı öncesi son doğrulama bu şemada yapılacaktır.
      </p>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 4 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 5: TEST VE KALİTE GÜVENCESİ METRİKLERİ -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">KALİTE VE GÜVENLİK</span>
      </div>
    </div>

    <h2>Test ve Kalite Güvencesi Metrikleri</h2>
    <p>Sistem, kamu kurumlarının gerektirdiği en katı siber güvenlik ve veri bütünlüğü standartlarına göre test edilmiştir.</p>

    <div class="grid-3" style="margin-bottom: 8px;">
      <div class="kpi-box" style="border-top: 3px solid #16a34a;">
        <div class="kpi-val" style="color: #16a34a;">528 / 528</div>
        <div class="kpi-label">Yetki Matrisi Testi</div>
        <div style="font-size: 7.5px; color: #64748b; margin-top: 2px;">%100 Başarı (0 Hata)</div>
      </div>
      <div class="kpi-box" style="border-top: 3px solid #0284c7;">
        <div class="kpi-val" style="color: #0284c7;">92 Uç Nokta</div>
        <div class="kpi-label">REST API Koruması</div>
        <div style="font-size: 7.5px; color: #64748b; margin-top: 2px;">Sıfır İzin Sapması (Drift: 0)</div>
      </div>
      <div class="kpi-box" style="border-top: 3px solid #6366f1;">
        <div class="kpi-val" style="color: #6366f1;">51 / 51</div>
        <div class="kpi-label">Playwright E2E Testi</div>
        <div style="font-size: 7.5px; color: #64748b; margin-top: 2px;">Tüm Tarayıcı Akışları Geçti</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 8px;">
      <h3 style="color: #0f172a;">Güvenlik ve Yetkilendirme Matrisi Doğrulama Özeti</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">Güvenlik Alanı</th>
            <th style="width: 48%;">Uygulanan Koruma ve Test Senaryosu</th>
            <th style="width: 15%;">Kontrol</th>
            <th style="width: 15%;">Sonuç</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Çapraz Müdürlük (IDOR/BOLA)</strong></td>
            <td>Bir müdürlük amirinin başka müdürlüğe varlık, oda veya personel ataması engellendi; sorgularda sessiz filtre doğrulandı.</td>
            <td>8 Senaryo</td>
            <td><span class="badge-tag tag-green">%100 İZOLASYON</span></td>
          </tr>
          <tr>
            <td><strong>STAFF Yazma Kilidi</strong></td>
            <td>Saha personelinin sistemde varlık, personel, hiyerarşi, araç durumu veya stok değiştirmesi 403 ile engellendi.</td>
            <td>7 Uç Nokta</td>
            <td><span class="badge-tag tag-green">%100 KİLİTLİ</span></td>
          </tr>
          <tr>
            <td><strong>CSRF Koruması</strong></td>
            <td>X-XSRF-TOKEN başlığı taşımayan tüm POST/PUT/DELETE istekleri veritabanına ulaşmadan 403 Forbidden ile reddedildi.</td>
            <td>5 Kritik Modül</td>
            <td><span class="badge-tag tag-green">%100 KORUMALI</span></td>
          </tr>
          <tr>
            <td><strong>Zimmet-Personel Kilidi</strong></td>
            <td>Üzerinde aktif zimmet bulunan bir personelin pasife alınması veya silinmesi 409 Conflict ile engellendi.</td>
            <td>İlişkisel Bütünlük</td>
            <td><span class="badge-tag tag-green">%100 KORUMALI</span></td>
          </tr>
          <tr>
            <td><strong>Stok Aşım Kilidi</strong></td>
            <td>Aynı anda birden fazla kullanıcının depodan yetersiz miktarda malzeme çekmesi <code>FOR UPDATE</code> kilidiyle engellendi.</td>
            <td>Eşzamanlılık</td>
            <td><span class="badge-tag tag-green">%100 KORUMALI</span></td>
          </tr>
          <tr>
            <td><strong>CSV Formül Kaçışı</strong></td>
            <td>Dışa aktarılan Excel dosyalarında formül enjeksiyonu önlendi; <code>DATA_EXPORT</code> denetim günlüğüne kaydedildi.</td>
            <td>İçerik Filtreleme</td>
            <td><span class="badge-tag tag-green">%100 KORUMALI</span></td>
          </tr>
          <tr>
            <td><strong>Gerçek İstemci IP İzi</strong></td>
            <td>İstemcilerin gönderdiği sahte <code>X-Forwarded-For</code> başlıkları elenerek gerçek soket IP'si audit loguna yazıldı.</td>
            <td>Ağ Güvenliği</td>
            <td><span class="badge-tag tag-green">%100 DOĞRU</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div class="card" style="margin-bottom: 0;">
        <h3 style="color: #0369a1;">Playwright E2E Tarayıcı Testleri</h3>
        <p>Kullanıcıların web arayüzünde yaptığı tüm işlemler Chromium tarayıcısı üzerinde otomatikleştirilmiş testlerle koşturulmaktadır:</p>
        <ul>
          <li><strong>R1 (Giriş & Güvenlik):</strong> Hatalı şifre denemeleri, 15 dk hesap kilidi, zorunlu şifre değişimi ve CSRF çıkış testi.</li>
          <li><strong>R2 (10 Okuma Ekranı):</strong> Dashboard, Hiyerarşi Ağacı, Binalar, 30 Müdürlük, Personel, Kategoriler, Raporlar, QR Kodlar.</li>
          <li><strong>R3 (İşlem Döngüsü):</strong> Varlık CRUD, Zimmet Atama, Zimmet İade, Bakım İş Emri Açma/Kapatma, Stok Çıkış/Giriş.</li>
          <li><strong>R4 (Yönetim):</strong> Kullanıcı Tanımlama, Araç KM Güncelleme, Sayım Okutma ve Denetim Günlüğü Filtreleme.</li>
        </ul>
      </div>

      <div class="card" style="margin-bottom: 0;">
        <h3 style="color: #0369a1;">Kalıcı Test Temizliği (Global Teardown)</h3>
        <p>Testlerin canlı veya geliştirme veritabanında çöp veri bırakması tamamen engellenmiştir:</p>
        <ul>
          <li><code>scripts/cleanup_test_artifacts.js</code> ile <code>TEST-%</code>, <code>CSRF-%</code> ve <code>SCL-IK-%</code> kayıtları test bitiminde otomatik silinir.</li>
          <li><code>frontend/e2e/global-teardown.ts</code> sayesinde her test koşumunun ardından veritabanı orijinal temiz haline döner.</li>
          <li>Üretim veritabanında test kalıntısı bırakılmaması garanti altına alınmıştır.</li>
        </ul>
      </div>
    </div>

    <div class="card card-highlight" style="margin-bottom: 0;">
      <h3 style="color: #0369a1; font-size: 11px;">Kalan P1 Geliştirmeleri (Tahmini Efor: Yaklaşık 4 İş Günü)</h3>
      <p style="font-size: 8.8px; margin-bottom: 0;">
        Çekirdek altyapısı ve kilit mekanizmaları tamamlanan sistemde canlı öncesi tamamlanacak kalan P1 kalemleri: yeni stok kartı açma modalı, TİF sarf fişi dökümü, resmi zimmet fişi ve ilişik kesme tutanağı A4 çıktısı ile giriş uç noktasında IP bazlı hız sınırlamasıdır.
      </p>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">Gebze Belediyesi Kurumsal Varlık Yönetimi Sistemi (EKYS)</div>
    <div class="footer-right">Sayfa 5 / 8</div>
  </div>
</div>

<!-- ==================================================================== -->
<!-- SAYFA 6: ARAYÜZ VİTRİNİ 1 (YÖNETİM VE ENVANTER) -->
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

    <h2>Kullanıcı Deneyimi: Yönetim ve Varlık Envanteri</h2>
    <p>Modern kamu kurumlarına uygun sade, hızlı, Türkçe destekli ve yüksek okunabilirlikli arayüz tasarımı:</p>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div>
        <div class="screenshot-frame">
          <img src="${images.dashboard}" alt="Yönetim Paneli" />
          <div class="screenshot-caption">
            <span>YÖNETİCİ KONSOLU (DASHBOARD)</span>
            <span class="badge-tag tag-blue">CANLI İZLEME</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 3px;">
          <strong>Özellikler:</strong> Toplam varlık, zimmetli varlık, bakımda olan cihaz ve kritik stok uyarıları; 30 müdürlüğün varlık dağılım grafiği ve anlık işlem akışı.
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
        <p style="font-size: 8.5px; color: #475569; margin-top: 3px;">
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
        <p style="font-size: 8.5px; color: #475569; margin-top: 3px;">
          <strong>Özellikler:</strong> Dinamik QR barkod, taşınır hesap kodu, amortisman durumu, 6 adımlı yaşam döngüsü durumu ve eksiksiz zimmet/bakım geçmişi.
        </p>
      </div>

      <div>
        <div class="screenshot-frame">
          <img src="${images.settings}" alt="Sistem Ayarları" />
          <div class="screenshot-caption">
            <span>SİSTEM AYARLARI VE NLS PARAMETRELERİ</span>
            <span class="badge-tag tag-blue">YAPILANDIRMA</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 3px;">
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

    <h2>Kullanıcı Deneyimi: Operasyon ve Denetim</h2>
    <p>El terminaliyle sayım çalışıyor, saha pilotu planlanıyor; zimmet, araç takip ve denetim izi modülleri:</p>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div>
        <div class="screenshot-frame">
          <img src="${images.personnel}" alt="Personel Zimmetleri" />
          <div class="screenshot-caption">
            <span>PERSONEL VE ZİMMET YÖNETİMİ</span>
            <span class="badge-tag tag-blue">RESMİ TUTANAK</span>
          </div>
        </div>
        <p style="font-size: 8.5px; color: #475569; margin-top: 3px;">
          <strong>Özellikler:</strong> Personele zimmetli demirbaşların tek ekranda izlenmesi, yeni zimmet fişi kesme, ambara iade alma ve ilişik kesme kontrolü.
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
        <p style="font-size: 8.5px; color: #475569; margin-top: 3px;">
          <strong>Özellikler:</strong> Oda ve kat bazlı sayım seansları; el terminali ile okutulan barkodların sistemle karşılaştırılması (Fazla/Eksik/Konum Farkı).
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
        <p style="font-size: 8.5px; color: #475569; margin-top: 3px;">
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
        <p style="font-size: 8.5px; color: #475569; margin-top: 3px;">
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
<!-- SAYFA 8: BAĞLANTI GÜNÜ RUNBOOK VE DOKÜMANTASYON -->
<!-- ==================================================================== -->
<div class="page">
  <div>
    <div class="page-header">
      <div class="header-left">
        <div class="gov-title">T.C. GEBZE BELEDİYESİ</div>
        <div class="sub-title">KURUMSAL VARLIK YÖNETİMİ SİSTEMİ (EKYS)</div>
      </div>
      <div class="header-right">
        <span class="badge">BAĞLANTI GÜNÜ RUNBOOK</span>
      </div>
    </div>

    <h2>Bağlantı Günü Kesintisiz Geçiş Runbook'u ve Dokümantasyon İndeksi</h2>
    <p>Belediyeden gerekli bilgiler ve erişim sağlandığında uygulanacak adım adım operasyonel zaman çizelgesi:</p>

    <div class="card" style="margin-bottom: 8px;">
      <h3 style="color: #0f172a;">Bağlantı Günü Saatlik Operasyon Çizelgesi (T-60 dk .. T+60 dk)</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 15%;">Zaman</th>
            <th style="width: 35%;">Uygulanacak Operasyonel Adım</th>
            <th style="width: 25%;">Sorumlu</th>
            <th style="width: 25%;">Kontrol Kriteri</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>T - 60 dk</strong></td>
            <td>Mevcut ortamın tam yedeğinin alınması (Docker volume & Data Pump).</td>
            <td>Sistem Yöneticisi</td>
            <td>Yedek boyutu doğrulandı.</td>
          </tr>
          <tr>
            <td><strong>T - 40 dk</strong></td>
            <td>Belediye DBA tarafından <code>docs/dba-kurulum.sql</code> betiğinin çalıştırılması.</td>
            <td>Belediye DBA</td>
            <td>Kullanıcılar ve roller açıldı.</td>
          </tr>
          <tr>
            <td><strong>T - 25 dk</strong></td>
            <td>Sunucuda <code>.env</code> dosyasının doldurulması (Şifreler, Service Name, IP).</td>
            <td>Sistem Yöneticisi</td>
            <td><code>SPRING_PROFILES_ACTIVE=prod</code></td>
          </tr>
          <tr>
            <td><strong>T - 15 dk</strong></td>
            <td>Spring Boot uygulamasının başlatılması ve Flyway şema göçünün tamamlanması.</td>
            <td>Proje Ekibi</td>
            <td><code>db/migration-prod</code> V1-V2 OK.</td>
          </tr>
          <tr>
            <td><strong>T - 05 dk</strong></td>
            <td><code>/api/health</code> sağlık kontrolü ve otomatik duman testlerinin koşturulması.</td>
            <td>Proje Ekibi</td>
            <td>HTTP 200 (DB: UP)</td>
          </tr>
          <tr>
            <td><strong>T + 00 dk</strong></td>
            <td>Kurumsal DNS yönlendirmesinin açılması ve personelin giriş yapması.</td>
            <td>Ağ Yöneticisi</td>
            <td><strong>CANLI SİSTEM DEVREDE</strong></td>
          </tr>
          <tr>
            <td><strong>T + 30 dk</strong></td>
            <td>İK Personel ve İlk Envanter Excel aktarımının arka planda tamamlanması.</td>
            <td>Mali Hizmetler & İK</td>
            <td>Veri sayıları teyit edildi.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid-2" style="margin-bottom: 8px;">
      <div class="card card-warning" style="margin-bottom: 0;">
        <h3 style="color: #92400e;">Geri Dönüş (Rollback) Planı</h3>
        <p style="font-size: 8.8px; margin-bottom: 4px;">
          Bağlantı gününde ağ, şema veya veri kaynaklı beklenmeyen bir sorunla karşılaşılırsa:
        </p>
        <ul>
          <li><strong>Veritabanı Geri Dönüşü:</strong> T-60 anında alınan Data Pump / dosya sistemi yedeği devreye alınır.</li>
          <li><strong>İzolasyon Güvencesi:</strong> Yeni şema izole tablespace ve kullanıcıda açıldığından mevcut belediye sistemlerine veya diğer şemalara etki etmez.</li>
          <li><strong>DNS ve Ağ Yönlendirmesi:</strong> DNS kaydı geri çekilerek trafik önceki sunucuya yönlendirilir.</li>
          <li><strong>Rollback Tetikleyicisi:</strong> Ağ erişiminin sağlanamaması, DBA izinlerinin gecikmesi veya kritik bir veri hatasında geri dönüş protokolü işletilir.</li>
        </ul>
      </div>

      <div class="card" style="margin-bottom: 0;">
        <h3 style="color: #0369a1;">Hazırlanan Teknik Dokümantasyonlar</h3>
        <ul>
          <li><code>docs/dba-kurulum.sql</code>: DBA'ya verilecek kullanıcı ve yetki betiği.</li>
          <li><code>docs/belediye-bt-sorulari.md</code>: Bilgi İşlem'e sorulacak 16 teknik soru.</li>
          <li><code>docs/baglanti-gunu-runbook.md</code>: Detaylı canlıya geçiş el kitabı.</li>
          <li><code>docs/migrasyon-yonetim-kurali.md</code>: Çift hatlı şema yönetim kuralı.</li>
          <li><code>docs/kuru-prova-19c.sql</code>: 19c şemasında çalıştırılacak prova betiği.</li>
        </ul>
      </div>
    </div>

    <div class="card card-highlight" style="margin-bottom: 0; text-align: center; padding: 12px;">
      <h2 style="font-size: 12.5px; margin-bottom: 4px; color: #0f172a;">Sonuç Değerlendirmesi</h2>
      <p style="font-size: 9.3px; text-align: justify; margin-bottom: 0; color: #334155;">
        Gebze Belediyesi Varlık Yönetimi Sistemi (EKYS); teknik altyapı olarak büyük ölçüde hazır olup, belediyeden gerekli ağ erişimi, veritabanı parametreleri ve test şeması sağlandığında kuru prova ile teyit edilecektir. Kalan yaklaşık 4 iş günlük P1 geliştirmeleri (stok kartı, TİF ve zimmet tutanakları, login rate-limiting) tamamlanarak sistem kesintisiz devreye alınabilecektir.
      </p>
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
    console.log('PDF üretimi başlatılıyor...');
    const browser = await chromium.launch({
        args: ['--font-render-hinting=medium', '--enable-font-antialiasing']
    });
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewportSize({ width: 1200, height: 1600 });
    
    // Set HTML content
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    
    // Wait for images to load completely
    await page.evaluate(async () => {
        const selectors = Array.from(document.querySelectorAll('img'));
        await Promise.all(selectors.map(img => {
            if (img.complete) return;
            return new Promise((resolve, reject) => {
                img.addEventListener('load', resolve);
                img.addEventListener('error', reject);
            });
        }));
    });

    // Generate PDF
    await page.pdf({
        path: OUTPUT_PDF_PATH,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    // Sayfa önizlemelerini kontrol amaçlı kaydet
    const previewDir = path.resolve(__dirname, '../docs/pdf_previews');
    if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
    const pages = await page.$$('.page');
    console.log(`Toplam sayfa div sayısı: ${pages.length}`);
    for (let i = 0; i < pages.length; i++) {
        await pages[i].screenshot({ path: path.join(previewDir, `sayfa-${i+1}.png`) });
    }
    console.log(`Önizleme görselleri kaydedildi: ${previewDir}`);

    await browser.close();
    console.log(`PDF başarıyla üretildi: ${OUTPUT_PDF_PATH}`);
    const stats = fs.statSync(OUTPUT_PDF_PATH);
    console.log(`Dosya boyutu: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bayt)`);
}

generatePDF().catch(err => {
    console.error('PDF üretilirken hata oluştu:', err);
    process.exit(1);
});
