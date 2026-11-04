package tr.gov.gebze.varlik.lifecycle;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tr.gov.gebze.varlik.common.ApiException;

@Component
public class AssetLifecycleValidator {

    private static final Map<AssetLifecycleStatus, Set<AssetLifecycleStatus>> TRANSITIONS = new EnumMap<>(AssetLifecycleStatus.class);

    static {
        // SATIN_ALINDI -> KAYDEDILDI, ZAYIAT_CALINMA
        TRANSITIONS.put(AssetLifecycleStatus.SATIN_ALINDI, EnumSet.of(
                AssetLifecycleStatus.KAYDEDILDI,
                AssetLifecycleStatus.ZAYIAT_CALINMA
        ));

        // KAYDEDILDI -> ZIMMETLENDI, KULLANIMDA, BAKIMDA, PASIF_ASKIDA, HURDAYA_AYRILDI, DEVREDILDI, BAGISLANDI, SATILDI, ZAYIAT_CALINMA
        TRANSITIONS.put(AssetLifecycleStatus.KAYDEDILDI, EnumSet.of(
                AssetLifecycleStatus.ZIMMETLENDI,
                AssetLifecycleStatus.KULLANIMDA,
                AssetLifecycleStatus.BAKIMDA,
                AssetLifecycleStatus.PASIF_ASKIDA,
                AssetLifecycleStatus.HURDAYA_AYRILDI,
                AssetLifecycleStatus.DEVREDILDI,
                AssetLifecycleStatus.BAGISLANDI,
                AssetLifecycleStatus.SATILDI,
                AssetLifecycleStatus.ZAYIAT_CALINMA
        ));

        // ZIMMETLENDI -> KAYDEDILDI, BAKIMDA, KULLANIMDA, ZIMMETLENDI, PASIF_ASKIDA, ZAYIAT_CALINMA
        TRANSITIONS.put(AssetLifecycleStatus.ZIMMETLENDI, EnumSet.of(
                AssetLifecycleStatus.KAYDEDILDI,
                AssetLifecycleStatus.BAKIMDA,
                AssetLifecycleStatus.KULLANIMDA,
                AssetLifecycleStatus.ZIMMETLENDI,
                AssetLifecycleStatus.PASIF_ASKIDA,
                AssetLifecycleStatus.ZAYIAT_CALINMA
        ));

        // KULLANIMDA -> KAYDEDILDI, ZIMMETLENDI, BAKIMDA, PASIF_ASKIDA, HURDAYA_AYRILDI, ZAYIAT_CALINMA
        TRANSITIONS.put(AssetLifecycleStatus.KULLANIMDA, EnumSet.of(
                AssetLifecycleStatus.KAYDEDILDI,
                AssetLifecycleStatus.ZIMMETLENDI,
                AssetLifecycleStatus.BAKIMDA,
                AssetLifecycleStatus.PASIF_ASKIDA,
                AssetLifecycleStatus.HURDAYA_AYRILDI,
                AssetLifecycleStatus.ZAYIAT_CALINMA
        ));

        // BAKIMDA -> KAYDEDILDI, KULLANIMDA, ZIMMETLENDI, HURDAYA_AYRILDI, ZAYIAT_CALINMA
        TRANSITIONS.put(AssetLifecycleStatus.BAKIMDA, EnumSet.of(
                AssetLifecycleStatus.KAYDEDILDI,
                AssetLifecycleStatus.KULLANIMDA,
                AssetLifecycleStatus.ZIMMETLENDI,
                AssetLifecycleStatus.HURDAYA_AYRILDI,
                AssetLifecycleStatus.ZAYIAT_CALINMA
        ));

        // PASIF_ASKIDA -> KAYDEDILDI, KULLANIMDA, ZIMMETLENDI, BAKIMDA, HURDAYA_AYRILDI, ZAYIAT_CALINMA
        TRANSITIONS.put(AssetLifecycleStatus.PASIF_ASKIDA, EnumSet.of(
                AssetLifecycleStatus.KAYDEDILDI,
                AssetLifecycleStatus.KULLANIMDA,
                AssetLifecycleStatus.ZIMMETLENDI,
                AssetLifecycleStatus.BAKIMDA,
                AssetLifecycleStatus.HURDAYA_AYRILDI,
                AssetLifecycleStatus.ZAYIAT_CALINMA
        ));

        // HURDAYA_AYRILDI -> SATILDI, PASIF_ASKIDA
        TRANSITIONS.put(AssetLifecycleStatus.HURDAYA_AYRILDI, EnumSet.of(
                AssetLifecycleStatus.SATILDI,
                AssetLifecycleStatus.PASIF_ASKIDA
        ));

        // DEVREDILDI, BAGISLANDI, SATILDI, ZAYIAT_CALINMA -> Terminal states
        TRANSITIONS.put(AssetLifecycleStatus.DEVREDILDI, EnumSet.noneOf(AssetLifecycleStatus.class));
        TRANSITIONS.put(AssetLifecycleStatus.BAGISLANDI, EnumSet.noneOf(AssetLifecycleStatus.class));
        TRANSITIONS.put(AssetLifecycleStatus.SATILDI, EnumSet.noneOf(AssetLifecycleStatus.class));
        TRANSITIONS.put(AssetLifecycleStatus.ZAYIAT_CALINMA, EnumSet.noneOf(AssetLifecycleStatus.class));
    }

    public boolean isValidTransition(AssetLifecycleStatus from, AssetLifecycleStatus to) {
        if (from == null || to == null) return false;
        if (from == to && from == AssetLifecycleStatus.ZIMMETLENDI) return true;
        Set<AssetLifecycleStatus> allowed = TRANSITIONS.get(from);
        return allowed != null && allowed.contains(to);
    }

    public Set<AssetLifecycleStatus> getAllowedNextStates(AssetLifecycleStatus current, String userRole) {
        if (current == null) return Collections.emptySet();
        Set<AssetLifecycleStatus> allowed = TRANSITIONS.getOrDefault(current, Collections.emptySet());
        Set<AssetLifecycleStatus> result = EnumSet.noneOf(AssetLifecycleStatus.class);
        boolean isAdmin = "ADMIN".equalsIgnoreCase(userRole);
        for (AssetLifecycleStatus s : allowed) {
            if (s.isFinalState() && !isAdmin) {
                continue; // Sonlandırma durumları ADMIN dışındaki rollere gösterilmez
            }
            result.add(s);
        }
        return result;
    }

    public void validateTransition(AssetLifecycleStatus from, AssetLifecycleStatus to, String userRole) {
        if (from == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Mevcut varlık yaşam döngüsü durumu geçersiz (NULL).");
        }
        if (to == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Hedef yaşam döngüsü durumu belirtilmedi.");
        }

        // Aynı durum geçişi (örneğin zimmet devri haricinde gereksiz tetikleme)
        if (from == to && from != AssetLifecycleStatus.ZIMMETLENDI) {
            return;
        }

        // 1. Yetki Kontrolü: Son durumları (HURDAYA_AYRILDI, DEVREDILDI, BAGISLANDI, SATILDI, ZAYIAT_CALINMA) yalnızca ADMIN yapabilir!
        if (to.isFinalState() && !"ADMIN".equalsIgnoreCase(userRole)) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Sonlandırma işlemleri (Hurdaya Ayırma, Devir, Bağış, Satış, Zayiat) yalnızca Sistem Yöneticisi (ADMIN) yetkisindedir.");
        }

        // 2. Durum Makinesi Matris Kontrolü
        if (!isValidTransition(from, to)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    String.format("Geçersiz durum geçişi: '%s' durumundaki bir varlık doğrudan '%s' durumuna geçirilemez.",
                            from.getLabel(), to.getLabel()));
        }
    }
}

