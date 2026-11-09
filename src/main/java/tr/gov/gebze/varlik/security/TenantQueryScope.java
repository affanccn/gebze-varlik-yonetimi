package tr.gov.gebze.varlik.security;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import tr.gov.gebze.varlik.common.ApiException;

/**
 * Gebze EKYS Kurumsal Çoklu Kiracılık ve Rol/Müdürlük İzolasyon Motoru.
 * Repository ve servislerdeki sorgulara merkezi güvenlik ve veri kapsamı enjekte eder.
 */
@Component
public class TenantQueryScope {

    private final JdbcClient jdbcClient;
    private final SecurityAuditService securityAuditService;

    public TenantQueryScope(JdbcClient jdbcClient, SecurityAuditService securityAuditService) {
        this.jdbcClient = jdbcClient;
        this.securityAuditService = securityAuditService;
    }

    public SystemUserDetails getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof SystemUserDetails userDetails) {
            return userDetails;
        }
        return null;
    }

    public String getCurrentUsername() {
        SystemUserDetails user = getCurrentUser();
        return user != null ? user.getUsername() : "anonim";
    }

    public boolean isFullScope() {
        SystemUserDetails user = getCurrentUser();
        if (user == null) return false;
        String role = user.getRole();
        if ("ADMIN".equalsIgnoreCase(role) || "AUDITOR".equalsIgnoreCase(role)) {
            return true;
        }
        if ("VIEWER".equalsIgnoreCase(role) && user.getDepartmentId() == null) {
            return true;
        }
        return false;
    }

    public boolean isDeptManager() {
        SystemUserDetails user = getCurrentUser();
        return user != null && "DEPT_MANAGER".equalsIgnoreCase(user.getRole());
    }

    public boolean isStaff() {
        SystemUserDetails user = getCurrentUser();
        return user != null && "STAFF".equalsIgnoreCase(user.getRole());
    }

    public boolean isViewer() {
        SystemUserDetails user = getCurrentUser();
        return user != null && "VIEWER".equalsIgnoreCase(user.getRole());
    }

    public Long getDepartmentId() {
        SystemUserDetails user = getCurrentUser();
        return user != null ? user.getDepartmentId() : null;
    }

    public Long getPersonnelId() {
        SystemUserDetails user = getCurrentUser();
        return user != null ? user.getPersonnelId() : null;
    }

    /**
     * assets tablosu için SQL filtre şartı (alias: a)
     */
    public String getAssetFilterClause(String alias) {
        String pfx = (alias != null && !alias.isBlank()) ? alias + "." : "";
        if (isFullScope()) {
            return " 1=1 ";
        }
        if (isDeptManager() || (isViewer() && getDepartmentId() != null)) {
            Long deptId = getDepartmentId();
            if (deptId == null) {
                return " 1=0 "; // Deny-by-default: Tanımsız müdürlüklü yöneticiye hiçbir kayıt dönmez
            }
            return " " + pfx + "department_id = " + deptId + " ";
        }
        if (isStaff()) {
            Long persId = getPersonnelId();
            if (persId == null) {
                return " 1=0 "; // Deny-by-default: Personele bağlı ID yoksa hiçbir kayıt dönmez
            }
            return " " + pfx + "id IN (SELECT sub_aa.asset_id FROM asset_assignments sub_aa WHERE sub_aa.personnel_id = " + persId + " AND sub_aa.status = 'AKTIF') ";
        }
        return " 1=0 "; // Tanımsız rol için varsayılan reddet
    }

    /**
     * stock_items tablosu için SQL filtre şartı (alias: si)
     */
    public String getStockItemFilterClause(String alias) {
        String pfx = (alias != null && !alias.isBlank()) ? alias + "." : "";
        if (isFullScope()) {
            return " 1=1 ";
        }
        if (isDeptManager() || (isViewer() && getDepartmentId() != null)) {
            Long deptId = getDepartmentId();
            if (deptId == null) return " 1=0 ";
            return " " + pfx + "department_id = " + deptId + " ";
        }
        return " 1=0 ";
    }

    /**
     * fleet_vehicles tablosu için SQL filtre şartı (alias: fv)
     */
    public String getFleetFilterClause(String alias) {
        String pfx = (alias != null && !alias.isBlank()) ? alias + "." : "";
        if (isFullScope()) {
            return " 1=1 ";
        }
        if (isDeptManager() || (isViewer() && getDepartmentId() != null)) {
            Long deptId = getDepartmentId();
            if (deptId == null) return " 1=0 ";
            return " " + pfx + "department_id = " + deptId + " ";
        }
        return " 1=0 ";
    }

    /**
     * procurement_orders tablosu için SQL filtre şartı (alias: po)
     */
    public String getProcurementFilterClause(String alias) {
        String pfx = (alias != null && !alias.isBlank()) ? alias + "." : "";
        if (isFullScope()) {
            return " 1=1 ";
        }
        if (isDeptManager() || (isViewer() && getDepartmentId() != null)) {
            Long deptId = getDepartmentId();
            if (deptId == null) return " 1=0 ";
            return " " + pfx + "department_id = " + deptId + " ";
        }
        return " 1=0 ";
    }

    /**
     * inventory_audits tablosu için SQL filtre şartı (alias: ia)
     */
    public String getAuditFilterClause(String alias) {
        String pfx = (alias != null && !alias.isBlank()) ? alias + "." : "";
        if (isFullScope()) {
            return " 1=1 ";
        }
        if (isDeptManager() || (isViewer() && getDepartmentId() != null)) {
            Long deptId = getDepartmentId();
            if (deptId == null) return " 1=0 ";
            return " " + pfx + "department_id = " + deptId + " ";
        }
        return " 1=0 ";
    }

    /**
     * STAFF için modül kısıt denetimi (Depo, Filo, Satın Alma, Sayım, Audit, Raporlar için 403)
     */
    public void enforceStaffModuleRestriction(String moduleName) {
        if (isStaff()) {
            logAndThrowAccessDenied("GET", "/api/" + moduleName, "Birim personeli (STAFF) '" + moduleName + "' modülüne erişemez.");
        }
    }

    /**
     * Belirli bir varlık ID'sine doğrudan erişim (GET /api/assets/{id}) yetkisi kontrolü
     */
    public void validateAssetReadAccess(Long assetId) {
        if (isFullScope()) return;

        if (assetId == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Geçersiz varlık kimliği.");
        }

        if (isStaff()) {
            Long persId = getPersonnelId();
            if (persId == null) {
                logAndThrowAccessDenied("GET", "/api/assets/" + assetId, "Personele bağlı zimmet tanımı bulunmuyor.");
            }
            Integer assigned = jdbcClient.sql("""
                SELECT COUNT(*) FROM asset_assignments 
                WHERE asset_id = :assetId AND personnel_id = :persId AND status = 'AKTIF'
            """)
            .param("assetId", assetId)
            .param("persId", persId)
            .query(Integer.class)
            .single();

            if (assigned == null || assigned == 0) {
                logAndThrowAccessDenied("GET", "/api/assets/" + assetId, "Varlık personele zimmetli değildir.");
            }
            return;
        }

        if (isDeptManager() || isViewer()) {
            Long userDeptId = getDepartmentId();
            if (userDeptId == null) {
                logAndThrowAccessDenied("GET", "/api/assets/" + assetId, "Kullanıcının müdürlük tanımı bulunmuyor.");
            }

            Long assetDeptId = jdbcClient.sql("SELECT department_id FROM assets WHERE id = :id AND is_deleted = 0")
                    .param("id", assetId)
                    .query(Long.class)
                    .optional()
                    .orElse(null);

            if (assetDeptId == null || !assetDeptId.equals(userDeptId)) {
                logAndThrowAccessDenied("GET", "/api/assets/" + assetId, "Varlık kullanıcının müdürlüğüne ait değildir.");
            }
        }
    }

    /**
     * Varlık üzerinde yazma/güncelleme/silme/transfer yetkisi kontrolü
     */
    public void validateAssetWriteAccess(Long assetId, Long targetDepartmentId) {
        SystemUserDetails user = getCurrentUser();
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Oturum bulunamadı.");
        }
        if ("AUDITOR".equalsIgnoreCase(user.getRole()) || "VIEWER".equalsIgnoreCase(user.getRole())) {
            logAndThrowAccessDenied("WRITE", "/api/assets/" + (assetId != null ? assetId : "new"), "Salt okunur rol veri üzerinde değişiklik yapamaz.");
        }
        if ("STAFF".equalsIgnoreCase(user.getRole())) {
            logAndThrowAccessDenied("WRITE", "/api/assets/" + (assetId != null ? assetId : "new"), "Birim personeli varlık ekleme/düzenleme/silme yetkisine sahip değildir.");
        }
        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            return;
        }

        if ("DEPT_MANAGER".equalsIgnoreCase(user.getRole())) {
            Long userDeptId = user.getDepartmentId();
            if (userDeptId == null) {
                logAndThrowAccessDenied("WRITE", "/api/assets/" + (assetId != null ? assetId : "new"), "Müdürlük yöneticisinin bağlı olduğu birim tanımsızdır.");
            }

            if (assetId != null) {
                Long currentDeptId = jdbcClient.sql("SELECT department_id FROM assets WHERE id = :id AND is_deleted = 0")
                        .param("id", assetId)
                        .query(Long.class)
                        .optional()
                        .orElse(null);

                if (currentDeptId == null || !currentDeptId.equals(userDeptId)) {
                    logAndThrowAccessDenied("WRITE", "/api/assets/" + assetId, "Başka bir müdürlüğün varlığı üzerinde işlem yapılamaz.");
                }
            }

            if (targetDepartmentId != null && !targetDepartmentId.equals(userDeptId)) {
                logAndThrowAccessDenied("WRITE", "/api/assets/" + (assetId != null ? assetId : "new"), "Başka bir müdürlük adına varlık oluşturulamaz veya taşınamaz.");
            }
        }
    }

    private void logAndThrowAccessDenied(String method, String uri, String reason) {
        securityAuditService.logAccessDenied(getCurrentUsername(), SecurityAuditService.resolveCurrentClientIp(), method, uri, reason);
        throw new ApiException(HttpStatus.FORBIDDEN, "Bu işlem için yetkiniz bulunmamaktadır: " + reason);
    }
}
