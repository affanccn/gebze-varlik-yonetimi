-- Gebze Belediyesi Varlık Yönetimi - V4 Kategori İsimleri Senkronizasyonu
-- assets tablosundaki 'category' metin alanını resmi 'asset_categories' isimleriyle eşitler

UPDATE assets
SET category = (
    SELECT name
    FROM asset_categories
    WHERE id = assets.category_id
)
WHERE category_id IS NOT NULL;

