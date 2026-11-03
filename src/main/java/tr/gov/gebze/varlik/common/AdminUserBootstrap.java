package tr.gov.gebze.varlik.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminUserBootstrap implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminUserBootstrap.class);

    private final JdbcClient jdbcClient;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.email:admin@gebze.bel.tr}")
    private String adminEmail;

    public AdminUserBootstrap(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            Integer adminCount = jdbcClient.sql("SELECT COUNT(*) FROM system_users WHERE role = 'ADMIN'")
                    .query(Integer.class)
                    .single();

            if (adminCount != null && adminCount > 0) {
                logger.info("[BOOTSTRAP] Sistemde kayıtlı yönetici hesabı mevcut (Adet: {}), bootstrap atlandı.", adminCount);
                return;
            }

            // Ortam değişkenini kontrol et
            String envPassword = System.getenv("APP_ADMIN_PASSWORD");
            if (envPassword == null || envPassword.isBlank()) {
                envPassword = System.getProperty("APP_ADMIN_PASSWORD");
            }

            if (envPassword == null || envPassword.isBlank()) {
                logger.warn("[UYARI] APP_ADMIN_PASSWORD ortam değişkeni tanımlanmadığı için ilk yönetici hesabı oluşturulmadı. " +
                        "Sistem yönetici girişi için bu değişkeni tanımlayarak uygulamayı başlatınız.");
                return;
            }

            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
            String passwordHash = encoder.encode(envPassword.trim());

            jdbcClient.sql("""
                INSERT INTO system_users (
                    username, password_hash, full_name, email, role, department_id, personnel_id, must_change_password, is_active
                ) VALUES (
                    :username, :passwordHash, :fullName, :email, 'ADMIN', NULL, NULL, 1, 1
                )
            """)
            .param("username", adminUsername.trim().toLowerCase())
            .param("passwordHash", passwordHash)
            .param("fullName", "Sistem Yöneticisi")
            .param("email", adminEmail.trim())
            .update();

            try {
                jdbcClient.sql("""
                    INSERT INTO system_audit_logs (
                        action_type, entity_type, entity_id, actor_username, actor_name, description
                    ) VALUES (
                        'BOOTSTRAP_ADMIN_CREATED', 'SYSTEM_USER', :username, 'SYSTEM', 'Sistem Bootstrap', 'İlk sistem yöneticisi ortam değişkeni ile oluşturuldu.'
                    )
                """).param("username", adminUsername.trim().toLowerCase()).update();
            } catch (Exception ex) {
                logger.debug("Bootstrap audit kaydı eklenemedi: {}", ex.getMessage());
            }

            logger.info("[BOOTSTRAP] İlk sistem yöneticisi başarıyla oluşturuldu: '{}' (must_change_password=1).", adminUsername);

        } catch (Exception e) {
            logger.warn("[BOOTSTRAP] system_users tablosu kontrol edilirken hata oluştu: {}", e.getMessage());
        }
    }
}
