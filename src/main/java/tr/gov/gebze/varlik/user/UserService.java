package tr.gov.gebze.varlik.user;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.security.PasswordPolicyValidator;

@Service
public class UserService {

    private static final Set<String> ALLOWED_ROLES = Set.of(
            "ADMIN", "DEPT_MANAGER", "STAFF", "AUDITOR", "VIEWER"
    );

    private final JdbcClient jdbcClient;
    private final PasswordEncoder passwordEncoder;

    public UserService(JdbcClient jdbcClient, PasswordEncoder passwordEncoder) {
        this.jdbcClient = jdbcClient;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UserResponse> listUsers(String role, Long departmentId, Boolean isActive) {
        StringBuilder sql = new StringBuilder("""
            SELECT u.id, u.username, u.full_name, u.email, u.role,
                   u.department_id, d.name AS department_name,
                   u.personnel_id, p.full_name AS personnel_name,
                   u.must_change_password, u.is_active,
                   u.failed_attempts, u.locked_until, u.created_at
            FROM system_users u
            LEFT JOIN departments d ON d.id = u.department_id
            LEFT JOIN personnel p ON p.id = u.personnel_id
            WHERE 1=1
        """);

        Map<String, Object> params = new HashMap<>();

        if (role != null && !role.isBlank()) {
            sql.append(" AND UPPER(u.role) = :role");
            params.put("role", role.trim().toUpperCase(Locale.ROOT));
        }

        if (departmentId != null) {
            sql.append(" AND u.department_id = :deptId");
            params.put("deptId", departmentId);
        }

        if (isActive != null) {
            sql.append(" AND u.is_active = :isActive");
            params.put("isActive", isActive ? 1 : 0);
        }

        sql.append(" ORDER BY u.id ASC");

        var client = jdbcClient.sql(sql.toString());
        for (var entry : params.entrySet()) {
            client.param(entry.getKey(), entry.getValue());
        }

        return client.query(this::mapUserResponse).list();
    }

    public UserResponse getUserById(Long id) {
        if (id == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Geçersiz kullanıcı ID.");
        }

        return jdbcClient.sql("""
            SELECT u.id, u.username, u.full_name, u.email, u.role,
                   u.department_id, d.name AS department_name,
                   u.personnel_id, p.full_name AS personnel_name,
                   u.must_change_password, u.is_active,
                   u.failed_attempts, u.locked_until, u.created_at
            FROM system_users u
            LEFT JOIN departments d ON d.id = u.department_id
            LEFT JOIN personnel p ON p.id = u.personnel_id
            WHERE u.id = :id
        """)
        .param("id", id)
        .query(this::mapUserResponse)
        .optional()
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı (ID: " + id + ")."));
    }

    @Transactional
    public UserResponse createUser(UserCreateRequest req, String currentAdminUsername, String clientIp) {
        if (req == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Kullanıcı bilgileri boş olamaz.");
        }

        String username = req.username() != null ? req.username().trim().toLowerCase(Locale.ROOT) : "";
        if (username.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Kullanıcı adı zorunludur.");
        }
        if (username.length() > 64) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Kullanıcı adı en fazla 64 karakter olabilir.");
        }
        if (!username.matches("^[a-z0-9._-]+$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Kullanıcı adı yalnızca küçük harf, rakam, nokta, alt çizgi ve tire içerebilir.");
        }

        // Tekillik kontrolü
        Integer count = jdbcClient.sql("SELECT COUNT(*) FROM system_users WHERE LOWER(username) = LOWER(:username)")
                .param("username", username)
                .query(Integer.class)
                .single();
        if (count != null && count > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "Bu kullanıcı adı sistemde zaten kullanılmaktadır.");
        }

        String fullName = req.fullName() != null ? req.fullName().trim() : "";
        if (fullName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Kullanıcı adı soyadı zorunludur.");
        }

        String email = req.email() != null && !req.email().isBlank() ? req.email().trim().toLowerCase(Locale.ROOT) : null;

        String role = req.role() != null ? req.role().trim().toUpperCase(Locale.ROOT) : "";
        if (!ALLOWED_ROLES.contains(role)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Geçersiz kullanıcı rolü. Kabul edilen roller: " + ALLOWED_ROLES);
        }

        // Rol ve ilişki doğrulama
        ValidatedRoleDetails roleDetails = validateRoleAndRelations(role, req.departmentId(), req.personnelId());

        // Şifre belirleme
        String rawPassword = req.password() != null ? req.password().trim() : "";
        String generatedTempPass = null;
        int mustChangePassword = 0;

        if (rawPassword.isBlank()) {
            generatedTempPass = PasswordPolicyValidator.generateTemporaryPassword();
            rawPassword = generatedTempPass;
            mustChangePassword = 1;
        } else {
            PasswordPolicyValidator.validate(rawPassword, username);
        }

        String passwordHash = passwordEncoder.encode(rawPassword);

        jdbcClient.sql("""
            INSERT INTO system_users (
                username, password_hash, full_name, email, role,
                department_id, personnel_id, must_change_password, is_active,
                failed_attempts, locked_until
            ) VALUES (
                :username, :hash, :fullName, :email, :role,
                :deptId, :personnelId, :mustChange, 1,
                0, NULL
            )
        """)
        .param("username", username)
        .param("hash", passwordHash)
        .param("fullName", fullName)
        .param("email", email)
        .param("role", role)
        .param("deptId", roleDetails.departmentId())
        .param("personnelId", roleDetails.personnelId())
        .param("mustChange", mustChangePassword)
        .update();

        Long newId = jdbcClient.sql("SELECT id FROM system_users WHERE LOWER(username) = LOWER(:username)")
                .param("username", username)
                .query(Long.class)
                .single();

        // Audit Log
        String newJson = String.format("{\"username\":\"%s\",\"fullName\":\"%s\",\"role\":\"%s\",\"deptId\":%s,\"persId\":%s}",
                username, fullName, role, roleDetails.departmentId(), roleDetails.personnelId());
        logAudit("USER_CREATE", String.valueOf(newId), currentAdminUsername, clientIp,
                "Yeni kullanıcı oluşturuldu: " + username + " (" + role + ")", null, newJson);

        UserResponse created = getUserById(newId);
        if (generatedTempPass != null) {
            return new UserResponse(
                    created.id(), created.username(), created.fullName(), created.email(),
                    created.role(), created.roleLabel(), created.departmentId(), created.departmentName(),
                    created.personnelId(), created.personnelName(), created.mustChangePassword(),
                    created.isActive(), created.failedAttempts(), created.isLocked(), created.lockedUntil(),
                    created.createdAt(), generatedTempPass
            );
        }
        return created;
    }

    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest req, String currentAdminUsername, Long currentAdminId, String clientIp) {
        if (id == null || req == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Geçersiz güncelleme isteği.");
        }

        UserResponse existing = getUserById(id);

        String newFullName = req.fullName() != null && !req.fullName().isBlank() ? req.fullName().trim() : existing.fullName();
        String newEmail = req.email() != null && !req.email().isBlank() ? req.email().trim().toLowerCase(Locale.ROOT) : null;
        String newRole = req.role() != null && !req.role().isBlank() ? req.role().trim().toUpperCase(Locale.ROOT) : existing.role();
        if (!ALLOWED_ROLES.contains(newRole)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Geçersiz kullanıcı rolü.");
        }

        boolean newIsActive = req.isActive() != null ? req.isActive() : existing.isActive();

        // 1. Son Aktif Admin Koruması
        if ("ADMIN".equalsIgnoreCase(existing.role()) && existing.isActive()) {
            if (!newIsActive || !"ADMIN".equalsIgnoreCase(newRole)) {
                int activeAdminCount = countActiveAdmins();
                if (activeAdminCount <= 1) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Sistemdeki son aktif yönetici hesabı pasife alınamaz veya rolü değiştirilemez.");
                }
            }
        }

        // 2. Kendi Hesabını Koruma
        if (currentAdminId != null && currentAdminId.equals(id)) {
            if (!newIsActive) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Kendi yönetici hesabınızı pasife alamazsınız.");
            }
            if (!"ADMIN".equalsIgnoreCase(newRole)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Kendi yönetici rolünüzü değiştiremezsiniz.");
            }
        }

        // 3. Rol ve İlişki Doğrulama
        Long reqDeptId = req.departmentId() != null ? req.departmentId() : existing.departmentId();
        Long reqPersId = req.personnelId() != null ? req.personnelId() : existing.personnelId();
        ValidatedRoleDetails roleDetails = validateRoleAndRelations(newRole, reqDeptId, reqPersId);

        jdbcClient.sql("""
            UPDATE system_users
            SET full_name = :fullName,
                email = :email,
                role = :role,
                department_id = :deptId,
                personnel_id = :persId,
                is_active = :isActive
            WHERE id = :id
        """)
        .param("fullName", newFullName)
        .param("email", newEmail)
        .param("role", newRole)
        .param("deptId", roleDetails.departmentId())
        .param("personnelId", roleDetails.personnelId())
        .param("isActive", newIsActive ? 1 : 0)
        .param("id", id)
        .update();

        String oldJson = String.format("{\"fullName\":\"%s\",\"role\":\"%s\",\"deptId\":%s,\"persId\":%s,\"isActive\":%b}",
                existing.fullName(), existing.role(), existing.departmentId(), existing.personnelId(), existing.isActive());
        String newJson = String.format("{\"fullName\":\"%s\",\"role\":\"%s\",\"deptId\":%s,\"persId\":%s,\"isActive\":%b}",
                newFullName, newRole, roleDetails.departmentId(), roleDetails.personnelId(), newIsActive);

        logAudit("USER_UPDATE", String.valueOf(id), currentAdminUsername, clientIp,
                "Kullanıcı güncellendi: " + existing.username(), oldJson, newJson);

        return getUserById(id);
    }

    @Transactional
    public UserResponse deactivateUser(Long id, String currentAdminUsername, Long currentAdminId, String clientIp) {
        if (id == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Geçersiz kullanıcı ID.");
        }

        UserResponse existing = getUserById(id);

        if ("ADMIN".equalsIgnoreCase(existing.role()) && existing.isActive()) {
            int activeAdminCount = countActiveAdmins();
            if (activeAdminCount <= 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Sistemdeki son aktif yönetici hesabı pasife alınamaz.");
            }
        }

        if (currentAdminId != null && currentAdminId.equals(id)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Kendi yönetici hesabınızı pasife alamazsınız.");
        }

        jdbcClient.sql("UPDATE system_users SET is_active = 0 WHERE id = :id")
                .param("id", id)
                .update();

        logAudit("USER_DEACTIVATE", String.valueOf(id), currentAdminUsername, clientIp,
                "Kullanıcı pasife alındı (is_active=0): " + existing.username(),
                "{\"isActive\":true}", "{\"isActive\":false}");

        return getUserById(id);
    }

    @Transactional
    public UserResetPasswordResponse resetPassword(Long id, String currentAdminUsername, String clientIp) {
        if (id == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Geçersiz kullanıcı ID.");
        }

        UserResponse user = getUserById(id);

        String tempPass = PasswordPolicyValidator.generateTemporaryPassword();
        String hash = passwordEncoder.encode(tempPass);

        jdbcClient.sql("""
            UPDATE system_users
            SET password_hash = :hash,
                must_change_password = 1,
                failed_attempts = 0,
                locked_until = NULL
            WHERE id = :id
        """)
        .param("hash", hash)
        .param("id", id)
        .update();

        logAudit("USER_PASSWORD_RESET", String.valueOf(id), currentAdminUsername, clientIp,
                "Kullanıcı şifresi sıfırlandı ve geçici şifre üretildi: " + user.username(),
                null, "{\"mustChangePassword\":1,\"failedAttempts\":0,\"lockedUntil\":null}");

        return new UserResetPasswordResponse(
                user.username(),
                tempPass,
                "Kullanıcı için rastgele güvenli geçici şifre oluşturuldu. Lütfen bu şifreyi kullanıcıya iletiniz. İlk girişte şifre değişimi zorunludur."
        );
    }

    private int countActiveAdmins() {
        Integer count = jdbcClient.sql("SELECT COUNT(*) FROM system_users WHERE role = 'ADMIN' AND is_active = 1")
                .query(Integer.class)
                .single();
        return count != null ? count : 0;
    }

    private record ValidatedRoleDetails(Long departmentId, Long personnelId) {}

    private ValidatedRoleDetails validateRoleAndRelations(String role, Long deptId, Long persId) {
        switch (role) {
            case "DEPT_MANAGER" -> {
                if (deptId == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Müdürlük Yöneticisi (DEPT_MANAGER) rolü için bir müdürlük seçilmesi zorunludur.");
                }
                verifyDepartmentExists(deptId);
                return new ValidatedRoleDetails(deptId, null);
            }
            case "STAFF" -> {
                if (persId == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Birim Personeli (STAFF) rolü için bir personel kaydı seçilmesi zorunludur.");
                }
                // Personeli doğrula ve müdürlüğünü al
                var persDeptOpt = jdbcClient.sql("SELECT department_id FROM personnel WHERE id = :id AND is_deleted = 0")
                        .param("id", persId)
                        .query(Long.class)
                        .optional();
                if (persDeptOpt.isEmpty()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Seçilen personel kaydı bulunamadı veya silinmiştir.");
                }
                Long actualDeptId = persDeptOpt.get();
                if (deptId != null && !deptId.equals(actualDeptId)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Seçilen personelin bağlı olduğu müdürlük ile kullanıcının müdürlüğü eşleşmelidir.");
                }
                return new ValidatedRoleDetails(actualDeptId, persId);
            }
            case "VIEWER" -> {
                if (deptId != null) {
                    verifyDepartmentExists(deptId);
                }
                return new ValidatedRoleDetails(deptId, null);
            }
            case "AUDITOR", "ADMIN" -> {
                return new ValidatedRoleDetails(null, null);
            }
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Bilinmeyen rol: " + role);
        }
    }

    private void verifyDepartmentExists(Long deptId) {
        Integer count = jdbcClient.sql("SELECT COUNT(*) FROM departments WHERE id = :id")
                .param("id", deptId)
                .query(Integer.class)
                .single();
        if (count == null || count == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Seçilen müdürlük sistemde kayıtlı değildir (ID: " + deptId + ").");
        }
    }

    private void logAudit(String actionType, String entityId, String username, String clientIp,
                          String description, String oldJson, String newJson) {
        try {
            jdbcClient.sql("""
                INSERT INTO system_audit_logs (
                    action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description, old_value_json, new_value_json
                ) VALUES (
                    :action, 'USER', :entityId, :username, :username, :ip, :desc, :oldJson, :newJson
                )
            """)
            .param("action", actionType)
            .param("entityId", entityId)
            .param("username", username != null ? username : "sistem")
            .param("ip", clientIp != null ? clientIp : "127.0.0.1")
            .param("desc", description)
            .param("oldJson", oldJson)
            .param("newJson", newJson)
            .update();
        } catch (Exception ignored) {}
    }

    private UserResponse mapUserResponse(ResultSet rs, int rowNum) throws SQLException {
        Long id = rs.getLong("id");
        String username = rs.getString("username");
        String fullName = rs.getString("full_name");
        String email = rs.getString("email");
        String role = rs.getString("role");

        Long deptId = rs.getLong("department_id");
        if (rs.wasNull()) deptId = null;
        String deptName = rs.getString("department_name");

        Long persId = rs.getLong("personnel_id");
        if (rs.wasNull()) persId = null;
        String persName = rs.getString("personnel_name");

        boolean mustChangePassword = rs.getInt("must_change_password") == 1;
        boolean isActive = rs.getInt("is_active") == 1;
        int failedAttempts = rs.getInt("failed_attempts");

        Timestamp lockedTs = rs.getTimestamp("locked_until");
        LocalDateTime lockedUntil = lockedTs != null ? lockedTs.toLocalDateTime() : null;
        boolean isLocked = lockedUntil != null && lockedUntil.isAfter(LocalDateTime.now());

        OffsetDateTime createdAt = null;
        try {
            createdAt = rs.getObject("created_at", OffsetDateTime.class);
        } catch (Exception ignored) {}

        String roleLabel = switch (role != null ? role.toUpperCase(Locale.ROOT) : "") {
            case "ADMIN" -> "Sistem Yöneticisi";
            case "DEPT_MANAGER" -> "Müdürlük Yöneticisi";
            case "STAFF" -> "Birim Personeli";
            case "AUDITOR" -> "İç Denetçi (Salt Okunur)";
            case "VIEWER" -> "Kurum İzleyicisi (Salt Okunur)";
            default -> role;
        };

        return new UserResponse(
                id, username, fullName, email, role, roleLabel,
                deptId, deptName, persId, persName,
                mustChangePassword, isActive, failedAttempts, isLocked, lockedUntil, createdAt, null
        );
    }
}
