package tr.gov.gebze.varlik.lifecycle;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.gov.gebze.varlik.asset.Asset;
import tr.gov.gebze.varlik.asset.AssetRepository;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.security.SecurityAuditService;
import tr.gov.gebze.varlik.security.TenantQueryScope;

@Service
public class AssetLifecycleService {

    private final JdbcClient jdbcClient;
    private final AssetRepository assetRepository;
    private final AssetLifecycleValidator validator;
    private final TenantQueryScope tenantQueryScope;

    public AssetLifecycleService(
            JdbcClient jdbcClient,
            AssetRepository assetRepository,
            AssetLifecycleValidator validator,
            TenantQueryScope tenantQueryScope
    ) {
        this.jdbcClient = jdbcClient;
        this.assetRepository = assetRepository;
        this.validator = validator;
        this.tenantQueryScope = tenantQueryScope;
    }

    /**
     * Yaşam döngüsü durum geçişini atomik olarak doğrular ve yürütür.
     */
    @Transactional
    public Asset transitionState(Long assetId, AssetLifecycleStatus targetStatus, String reason, String actorUsername) {
        if (assetId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Varlık kimliği boş olamaz.");
        }
        if (targetStatus == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Hedef yaşam döngüsü durumu belirtilmelidir.");
        }

        // 1. Varlık satırını eşzamanlı çakışmalara karşı kilitle (Pessimistic Lock: SELECT FOR UPDATE)
        Long lockedId = jdbcClient.sql("SELECT id FROM assets WHERE id = :id AND is_deleted = 0 FOR UPDATE")
                .param("id", assetId)
                .query(Long.class)
                .optional()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Varlık bulunamadı: ID=" + assetId));

        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Varlık bulunamadı: ID=" + assetId));

        // 2. Yetki Kontrolü (Müdürlük ve Yazma Yetkisi)
        tenantQueryScope.validateAssetWriteAccess(assetId, null);

        var currentUser = tenantQueryScope.getCurrentUser();
        String userRole = currentUser != null ? currentUser.getRole() : "ADMIN";
        String actor = (actorUsername != null && !actorUsername.isBlank()) ? actorUsername : tenantQueryScope.getCurrentUsername();

        AssetLifecycleStatus currentStatus = AssetLifecycleStatus.fromString(asset.lifecycleStatus() != null ? asset.lifecycleStatus() : asset.status());

        // Aynı durum geçişi kontrolü (ZIMMETLENDI -> ZIMMETLENDI hariç aynı duruma geçişte değişiklik yapma)
        if (currentStatus == targetStatus && targetStatus != AssetLifecycleStatus.ZIMMETLENDI) {
            return asset;
        }

        // 3. Durum Makinesi Doğrulaması (Geçersiz geçişlerde 409, Yetkisiz son durumlarda 403)
        validator.validateTransition(currentStatus, targetStatus, userRole);

        // 4. Türetim: legacy status ve is_active
        String newLegacyStatus = targetStatus.getLegacyStatus();
        int newIsActive = targetStatus.isActive() ? 1 : 0;

        // 5. Atomik Güncelleme
        String updateSql = """
            UPDATE assets SET
                lifecycle_status = :lifecycleStatus,
                status = :status,
                is_active = :isActive,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id AND is_deleted = 0
        """;

        int affected = jdbcClient.sql(updateSql)
                .param("lifecycleStatus", targetStatus.name())
                .param("status", newLegacyStatus)
                .param("isActive", newIsActive)
                .param("id", assetId)
                .update();

        if (affected == 0) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Varlık durumu güncellenemedi.");
        }

        // 6. Audit Log Kaydı (old_value_json ve new_value_json ile)
        String oldJson = String.format("{\"lifecycle_status\":\"%s\",\"status\":\"%s\",\"is_active\":%d}",
                currentStatus.name(), asset.status(), (asset.lifecycleStatus() != null && AssetLifecycleStatus.fromString(asset.lifecycleStatus()).isActive()) ? 1 : 1);
        String newJson = String.format("{\"lifecycle_status\":\"%s\",\"status\":\"%s\",\"is_active\":%d}",
                targetStatus.name(), newLegacyStatus, newIsActive);
        String description = String.format("Yaşam döngüsü durumu değiştirildi: %s -> %s. Gerekçe: %s",
                currentStatus.getLabel(), targetStatus.getLabel(), (reason != null ? reason : "Operasyonel süreç"));

        String clientIp = SecurityAuditService.resolveCurrentClientIp();
        try {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description, old_value_json, new_value_json
                ) VALUES (
                    'LIFECYCLE_TRANSITION', 'ASSET', :entityId, :username, :actorName, :clientIp, :description, :oldJson, :newJson
                )
            """)
            .param("entityId", String.valueOf(assetId))
            .param("username", actor)
            .param("actorName", currentUser != null ? currentUser.getFullName() : actor)
            .param("clientIp", clientIp)
            .param("description", description)
            .param("oldJson", oldJson)
            .param("newJson", newJson)
            .update();
        } catch (Exception e) {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description
                ) VALUES (
                    'LIFECYCLE_TRANSITION', 'ASSET', :entityId, :username, :actorName, :clientIp, :description
                )
            """)
            .param("entityId", String.valueOf(assetId))
            .param("username", actor)
            .param("actorName", currentUser != null ? currentUser.getFullName() : actor)
            .param("clientIp", clientIp)
            .param("description", description)
            .update();
        }

        return assetRepository.findById(assetId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Güncellenen varlık bulunamadı."));
    }

    public Set<AssetLifecycleStatus> getAvailableTransitions(Long assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Varlık bulunamadı: ID=" + assetId));
        tenantQueryScope.validateAssetReadAccess(assetId);

        var currentUser = tenantQueryScope.getCurrentUser();
        String userRole = currentUser != null ? currentUser.getRole() : "ADMIN";
        AssetLifecycleStatus current = AssetLifecycleStatus.fromString(asset.lifecycleStatus() != null ? asset.lifecycleStatus() : asset.status());

        return validator.getAllowedNextStates(current, userRole);
    }
}

