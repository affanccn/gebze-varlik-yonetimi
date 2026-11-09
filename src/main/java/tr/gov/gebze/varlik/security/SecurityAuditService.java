package tr.gov.gebze.varlik.security;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class SecurityAuditService {

    private static final Logger logger = LoggerFactory.getLogger(SecurityAuditService.class);

    private final JdbcClient jdbcClient;

    public SecurityAuditService(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public static String resolveCurrentClientIp() {
        try {
            if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
                HttpServletRequest req = attrs.getRequest();
                String xff = req.getHeader("X-Forwarded-For");
                if (xff != null && !xff.isBlank()) {
                    return xff.split(",")[0].trim();
                }
                String remoteAddr = req.getRemoteAddr();
                if (remoteAddr != null && !remoteAddr.isBlank()) {
                    return remoteAddr;
                }
            }
        } catch (Exception ignored) {
        }
        return "127.0.0.1";
    }

    /**
     * Başarısız giriş denemesi - REQUIRES_NEW ile ana transaction'dan bağımsız yazılır.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logFailedLogin(String username, String clientIp, String reason) {
        try {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description
                ) VALUES (
                    'FAILED_LOGIN_ATTEMPT', 'SECURITY', :username, :username, 'Anonim / Başarısız Kullanıcı', :clientIp, :description
                )
            """)
            .param("username", username != null ? username.trim().toLowerCase() : "bilinmiyor")
            .param("clientIp", clientIp != null ? clientIp : "127.0.0.1")
            .param("description", "Giriş denemesi başarısız: " + reason)
            .update();
        } catch (Exception ex) {
            logger.error("Başarısız giriş audit logu kaydedilemedi: {}", ex.getMessage());
        }
    }

    /**
     * Yetkisiz erişim teşebbüsü (403) - REQUIRES_NEW ile bağımsız yazılır.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAccessDenied(String username, String clientIp, String method, String uri, String reason) {
        try {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description
                ) VALUES (
                    'ACCESS_DENIED', 'SECURITY', :uri, :username, :username, :clientIp, :description
                )
            """)
            .param("uri", uri != null ? uri : "/")
            .param("username", username != null ? username : "anonim")
            .param("clientIp", clientIp != null ? clientIp : "127.0.0.1")
            .param("description", "Erişim reddedildi [" + method + " " + uri + "]: " + reason)
            .update();
        } catch (Exception ex) {
            logger.error("Yetkisiz erişim audit logu kaydedilemedi: {}", ex.getMessage());
        }
    }

    /**
     * Başarılı kullanıcı girişi.
     */
    @Transactional
    public void logLoginSuccess(String username, String fullName, String clientIp) {
        try {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description
                ) VALUES (
                    'LOGIN_SUCCESS', 'USER', :username, :username, :fullName, :clientIp, 'Güvenli kullanıcı oturumu açıldı.'
                )
            """)
            .param("username", username)
            .param("fullName", fullName != null ? fullName : username)
            .param("clientIp", clientIp != null ? clientIp : "127.0.0.1")
            .update();
        } catch (Exception ex) {
            logger.error("Giriş başarı audit logu kaydedilemedi: {}", ex.getMessage());
        }
    }

    /**
     * Kullanıcı çıkışı (Logout).
     */
    @Transactional
    public void logLogout(String username, String fullName, String clientIp) {
        try {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description
                ) VALUES (
                    'LOGOUT', 'USER', :username, :username, :fullName, :clientIp, 'Kullanıcı oturumu başarıyla sonlandırıldı.'
                )
            """)
            .param("username", username != null ? username : "bilinmiyor")
            .param("fullName", fullName != null ? fullName : username)
            .param("clientIp", clientIp != null ? clientIp : "127.0.0.1")
            .update();
        } catch (Exception ex) {
            logger.error("Çıkış audit logu kaydedilemedi: {}", ex.getMessage());
        }
    }

    /**
     * Hesap kilitleme olayı - REQUIRES_NEW ile bağımsız kalıcı kaydedilir.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAccountLocked(String username, String clientIp, int minutes) {
        try {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description
                ) VALUES (
                    'ACCOUNT_LOCKED', 'SECURITY', :username, :username, 'Sistem Güvenlik Servisi', :clientIp, :description
                )
            """)
            .param("username", username != null ? username.trim().toLowerCase() : "bilinmiyor")
            .param("clientIp", clientIp != null ? clientIp : "127.0.0.1")
            .param("description", String.format("Hesap 5 hatalı giriş denemesi nedeniyle %d dakika süreyle kilitlendi.", minutes))
            .update();
        } catch (Exception ex) {
            logger.error("Hesap kilitleme audit logu kaydedilemedi: {}", ex.getMessage());
        }
    }

    /**
     * Şifre değiştirme.
     */
    @Transactional
    public void logPasswordChanged(String username, String fullName, String clientIp) {
        try {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description
                ) VALUES (
                    'PASSWORD_CHANGED', 'USER', :username, :username, :fullName, :clientIp, 'Kullanıcı şifresi başarıyla güncellendi (must_change_password=0 yapıldı).'
                )
            """)
            .param("username", username)
            .param("fullName", fullName != null ? fullName : username)
            .param("clientIp", clientIp != null ? clientIp : "127.0.0.1")
            .update();
        } catch (Exception ex) {
            logger.error("Şifre değişim audit logu kaydedilemedi: {}", ex.getMessage());
        }
    }

    public void logAction(String actionType, String entityType, String entityId, String username, String fullName, String clientIp, String description) {
        try {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name,
                    ip_address, description, created_at
                ) VALUES (:actionType, :entityType, :entityId, :username, :fullName, :clientIp, :description, CURRENT_TIMESTAMP)
            """)
            .param("actionType", actionType)
            .param("entityType", entityType)
            .param("entityId", entityId != null ? entityId : "-")
            .param("username", username != null ? username : "SISTEM")
            .param("fullName", fullName != null ? fullName : "Sistem")
            .param("clientIp", clientIp != null ? clientIp : "127.0.0.1")
            .param("description", description)
            .update();
        } catch (Exception ex) {
            logger.error("Genel audit logu kaydedilemedi: {}", ex.getMessage());
        }
    }
}
