# Migrasyon Çift Set (Dual-Track) Yönetim Kuralı

> **Kuralın Amacı:** Geliştirme ortamında (`db/migration/`) Flyway checksum geçmişini bozmadan ilerlerken, üretim ortamında (`db/migration-prod/`) Oracle 19c/21c/23ai uyumlu (`CLOB CHECK (... IS JSON)`) ve **sıfır demo verili** temiz şemayı garanti altına almaktır.

---

## 1. Zorunlu Çift Set (Dual-Track) Kuralı

Bundan sonra projeye eklenecek her yeni şema değişikliği (tablo, sütun, indeks, kısıt, tetikleyici, görünüm) **HER İKİ SETTE DE AYNI ANDA** yer almalıdır:

1. **Geliştirme Seti (`src/main/resources/db/migration/`):**
   - Sıradaki sürüm numarasıyla yeni dosya eklenir: `V<N>__aciklama.sql` (örn. `V18__yeni_ozellik.sql`).
   - Mevcut `V1`..`V17` dosyaları **ASLA değiştirilmez** (aksi halde Flyway checksum doğrulaması patlar).

2. **Üretim Seti (`src/main/resources/db/migration-prod/`):**
   - Sıradaki sürüm numarasıyla yeni dosya eklenir: `V<M>__aciklama.sql` (örn. `V3__yeni_ozellik.sql`).
   - Sütun JSON içeriyorsa yerel `JSON` tipi yerine mutlaka **`CLOB CHECK (<sütun> IS JSON)`** sözdizimi kullanılır (Oracle 19c desteği için).
   - Dosya içinde **asla test veya demo verisi** (`DEMO-*`, `TEST-*`) eklenmez; yalnızca resmi taksonomi veya yapısal şema eklenir.

---

## 2. Otomatik Eşdeğerlik Denetimi

Herhangi bir migrasyon eklendikten veya değiştirildikten sonra aşağıdaki denetim betiği çalıştırılmalıdır:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test_migration_equivalence.ps1
```

Bu betik:
- Geliştirme veritabanı (`VARLIK_APP`) ile sıfırdan kurulan üretim şemasını (`VARLIK_EQ_PROD`) karşılaştırır.
- Tablolar, sütunlar (tip/uzunluk/nullability), indeksler, kısıtlar (PK/FK/UK/CHECK), tetikleyiciler, görünümler, sequence'ler, resmi müdürlük kodları ve kategori adlarını denetler.
- `SONUC: ESDEGER` çıktısı alınmadan commit atılamaz.
