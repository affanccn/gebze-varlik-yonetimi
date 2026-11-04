package tr.gov.gebze.varlik.lifecycle;

public enum AssetLifecycleStatus {
    SATIN_ALINDI("Depoda", true, "Satın Alındı", "status-store"),
    KAYDEDILDI("Depoda", true, "Kaydedildi (Ambar)", "status-store"),
    ZIMMETLENDI("Zimmetli", true, "Zimmetlendi", "status-aktif"),
    KULLANIMDA("Aktif", true, "Kullanımda (Ortak)", "status-aktif"),
    BAKIMDA("Bakımda", true, "Bakımda", "status-maint"),
    PASIF_ASKIDA("Pasif", false, "Pasif / Askıda", "status-pasif"),
    HURDAYA_AYRILDI("Hurda", false, "Hurdaya Ayrıldı (HEK)", "status-hurda"),
    DEVREDILDI("Pasif", false, "Devredildi", "status-pasif"),
    BAGISLANDI("Pasif", false, "Bağışlandı", "status-pasif"),
    SATILDI("Pasif", false, "Satıldı", "status-pasif"),
    ZAYIAT_CALINMA("Pasif", false, "Zayiat / Çalınma", "status-zayiat");

    private final String legacyStatus;
    private final boolean active;
    private final String label;
    private final String badgeClass;

    AssetLifecycleStatus(String legacyStatus, boolean active, String label, String badgeClass) {
        this.legacyStatus = legacyStatus;
        this.active = active;
        this.label = label;
        this.badgeClass = badgeClass;
    }

    public String getLegacyStatus() {
        return legacyStatus;
    }

    public boolean isActive() {
        return active;
    }

    public String getLabel() {
        return label;
    }

    public String getBadgeClass() {
        return badgeClass;
    }

    public boolean isFinalState() {
        return this == HURDAYA_AYRILDI || this == DEVREDILDI || this == BAGISLANDI || this == SATILDI || this == ZAYIAT_CALINMA;
    }

    public static AssetLifecycleStatus fromString(String val) {
        if (val == null || val.isBlank()) {
            return KAYDEDILDI;
        }
        String clean = val.trim().toUpperCase();
        try {
            return AssetLifecycleStatus.valueOf(clean);
        } catch (IllegalArgumentException e) {
            return switch (clean) {
                case "DEPODA" -> KAYDEDILDI;
                case "ZIMMETLI" -> ZIMMETLENDI;
                case "AKTIF" -> KULLANIMDA;
                case "BAKIMDA" -> BAKIMDA;
                case "HURDA" -> HURDAYA_AYRILDI;
                case "PASIF" -> PASIF_ASKIDA;
                default -> KAYDEDILDI;
            };
        }
    }
}

