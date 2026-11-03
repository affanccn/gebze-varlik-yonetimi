package tr.gov.gebze.varlik.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Yalnızca 'dev' profilinde çalışan, test ve geliştirme amaçlı kullanıcıları oluşturan seeder.
 * Üretim (production / default) profilinde kesinlikle çalışmaz.
 */
@Component
@Profile("dev")
public class DevUserSeeder implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(DevUserSeeder.class);

    private final JdbcClient jdbcClient;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.dev.password:${DEV_USER_PASSWORD:GebzeDev2026!}}")
    private String devPassword;

    public DevUserSeeder(JdbcClient jdbcClient, PasswordEncoder passwordEncoder) {
        this.jdbcClient = jdbcClient;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        logger.info("[DEV SEEDER] 'dev' profili aktif, geliştirme test kullanıcıları kontrol ediliyor...");

        try {
            Long fenDeptId = jdbcClient.sql("""
                SELECT id FROM departments 
                WHERE code = 'DEPT-11' OR name LIKE '%Fen İşleri%' 
                FETCH FIRST 1 ROWS ONLY
            """)
            .query(Long.class)
            .optional()
            .orElse(11L);

            Long realPersonnelId = jdbcClient.sql("""
                SELECT id FROM personnel 
                WHERE registration_number = 'SCL-1101' OR department_id = :deptId
                FETCH FIRST 1 ROWS ONLY
            """)
            .param("deptId", fenDeptId)
            .query(Long.class)
            .optional()
            .orElse(null);

            String encodedPassword = passwordEncoder.encode(devPassword.trim());

            // 1. Fen İşleri Müdürlük Yöneticisi (DEPT_MANAGER)
            seedUserIfNotExists(
                "fen_isleri_mudur",
                encodedPassword,
                "Fen İşleri Müdürü",
                "fenisleri.mudur@gebze.bel.tr",
                "DEPT_MANAGER",
                fenDeptId,
                null
            );

            // 2. Fen İşleri Saha Personeli (STAFF - Gerçek bir personnel_id'ye bağlı)
            seedUserIfNotExists(
                "saha_personel",
                encodedPassword,
                "Fatih Koç",
                "fatih.koc@gebze.bel.tr",
                "STAFF",
                fenDeptId,
                realPersonnelId
            );

            // 3. İç Denetçi (AUDITOR - Salt Okunur)
            seedUserIfNotExists(
                "ic_denetci",
                encodedPassword,
                "İç Denetim Uzmanı",
                "icdenetim@gebze.bel.tr",
                "AUDITOR",
                null,
                null
            );

            // 4. Kurum İzleyicisi (VIEWER - Salt Okunur)
            seedUserIfNotExists(
                "kurum_izleyici",
                encodedPassword,
                "Kurum İzleyicisi",
                "izleyici@gebze.bel.tr",
                "VIEWER",
                null,
                null
            );

            logger.info("[DEV SEEDER] Test kullanıcıları doğrulandı ve hazır.");

        } catch (Exception e) {
            logger.warn("[DEV SEEDER] Test kullanıcıları oluşturulurken hata: {}", e.getMessage());
        }
    }

    private void seedUserIfNotExists(String username, String passwordHash, String fullName,
                                     String email, String role, Long departmentId, Long personnelId) {
        Integer count = jdbcClient.sql("SELECT COUNT(*) FROM system_users WHERE LOWER(username) = LOWER(:username)")
                .param("username", username)
                .query(Integer.class)
                .single();

        if (count != null && count > 0) {
            return;
        }

        jdbcClient.sql("""
            INSERT INTO system_users (
                username, password_hash, full_name, email, role,
                department_id, personnel_id, must_change_password, is_active
            ) VALUES (
                :username, :passwordHash, :fullName, :email, :role,
                :deptId, :persId, 0, 1
            )
        """)
        .param("username", username.toLowerCase())
        .param("passwordHash", passwordHash)
        .param("fullName", fullName)
        .param("email", email)
        .param("role", role)
        .param("deptId", departmentId)
        .param("persId", personnelId)
        .update();

        logger.info("[DEV SEEDER] Test kullanıcısı oluşturuldu: '{}' (Rol: {}, must_change_password=0)", username, role);
    }
}
