package tr.gov.gebze.varlik.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tr.gov.gebze.varlik.security.PasswordPolicyValidator;
import tr.gov.gebze.varlik.security.SecurityAuditService;
import tr.gov.gebze.varlik.security.SystemUser;
import tr.gov.gebze.varlik.security.SystemUserDetails;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(String username, String password) {}
    public record ChangePasswordRequest(String currentPassword, String newPassword) {}

    private final AuthenticationManager authenticationManager;
    private final AuthService authService;
    private final SecurityAuditService securityAuditService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcClient jdbcClient;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public AuthController(AuthenticationManager authenticationManager,
                          AuthService authService,
                          SecurityAuditService securityAuditService,
                          PasswordEncoder passwordEncoder,
                          JdbcClient jdbcClient) {
        this.authenticationManager = authenticationManager;
        this.authService = authService;
        this.securityAuditService = securityAuditService;
        this.passwordEncoder = passwordEncoder;
        this.jdbcClient = jdbcClient;
    }

    @GetMapping("/demo-users")
    public List<Map<String, Object>> getDemoUsers() {
        return authService.getPublicDemoAccounts();
    }

    @PostMapping("/login")
    public UserSession login(@RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        if (request == null || request.username() == null || request.username().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Kullanıcı adı boş bırakılamaz.");
        }
        if (request.password() == null || request.password().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Şifre boş bırakılamaz.");
        }

        String username = request.username().trim().toLowerCase();
        String clientIp = httpRequest.getRemoteAddr();

        // 1. Kullanıcıyı veritabanından sorgula
        Optional<SystemUser> userOpt = jdbcClient.sql("""
            SELECT id, username, password_hash, full_name, email, role,
                   department_id, personnel_id, must_change_password, is_active,
                   failed_attempts, locked_until, created_at
            FROM system_users
            WHERE LOWER(username) = LOWER(:username)
        """)
        .param("username", username)
        .query((rs, rowNum) -> {
            SystemUser u = new SystemUser();
            u.setId(rs.getLong("id"));
            u.setUsername(rs.getString("username"));
            u.setPasswordHash(rs.getString("password_hash"));
            u.setFullName(rs.getString("full_name"));
            u.setEmail(rs.getString("email"));
            u.setRole(rs.getString("role"));

            long deptId = rs.getLong("department_id");
            u.setDepartmentId(rs.wasNull() ? null : deptId);

            long persId = rs.getLong("personnel_id");
            u.setPersonnelId(rs.wasNull() ? null : persId);

            u.setMustChangePassword(rs.getInt("must_change_password") == 1);
            u.setActive(rs.getInt("is_active") == 1);
            u.setFailedAttempts(rs.getInt("failed_attempts"));

            try {
                java.sql.Timestamp lockedTs = rs.getTimestamp("locked_until");
                u.setLockedUntil(lockedTs != null ? lockedTs.toLocalDateTime() : null);
            } catch (Exception ignored) {}

            return u;
        })
        .optional();

        if (userOpt.isEmpty()) {
            securityAuditService.logFailedLogin(username, clientIp, "Tanımsız kullanıcı adı");
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Kullanıcı adı veya şifre hatalı. Kalan deneme hakkınız: 5.");
        }

        SystemUser user = userOpt.get();

        // 2. Pasiflik kontrolü
        if (!user.isActive()) {
            securityAuditService.logFailedLogin(username, clientIp, "Pasif hesap ile giriş teşebbüsü");
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Kullanıcı hesabı devre dışı bırakılmıştır. Lütfen sistem yöneticisi ile iletişime geçiniz.");
        }

        // 3. Hesap kilitleme kontrolü
        if (user.isAccountLocked()) {
            LocalDateTime now = LocalDateTime.now();
            long minutesLeft = Duration.between(now, user.getLockedUntil()).toMinutes() + 1;
            if (minutesLeft < 1) minutesLeft = 1;
            securityAuditService.logFailedLogin(username, clientIp, "Kilitli hesaba giriş teşebbüsü");
            throw new ApiException(HttpStatus.FORBIDDEN,
                String.format("Hesabınız çok sayıda hatalı deneme nedeniyle kilitlenmiştir. Lütfen %d dakika sonra tekrar deneyiniz.", minutesLeft));
        }

        // 4. Kimlik doğrulama
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, request.password())
            );

            // Başarılı girişte sayaç ve kilit sıfırlanır
            jdbcClient.sql("""
                UPDATE system_users
                SET failed_attempts = 0, locked_until = NULL
                WHERE id = :id
            """)
            .param("id", user.getId())
            .update();

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, httpRequest, httpResponse);

            SystemUserDetails userDetails = (SystemUserDetails) authentication.getPrincipal();
            securityAuditService.logLoginSuccess(userDetails.getUsername(), userDetails.getFullName(), clientIp);

            HttpSession session = httpRequest.getSession(false);
            String sessionId = session != null ? session.getId() : null;

            return authService.toUserSession(userDetails, sessionId);

        } catch (AuthenticationException ex) {
            int newFailedAttempts = user.getFailedAttempts() + 1;
            if (newFailedAttempts >= 5) {
                jdbcClient.sql("""
                    UPDATE system_users
                    SET failed_attempts = 5,
                        locked_until = CURRENT_TIMESTAMP + INTERVAL '15' MINUTE
                    WHERE id = :id
                """)
                .param("id", user.getId())
                .update();

                securityAuditService.logAccountLocked(username, clientIp, 15);
                securityAuditService.logFailedLogin(username, clientIp, "5 hatalı deneme sonrası hesap 15 dakika kilitlendi");

                throw new ApiException(HttpStatus.FORBIDDEN,
                    "Hesabınız çok sayıda hatalı deneme nedeniyle kilitlenmiştir. Lütfen 15 dakika sonra tekrar deneyiniz.");
            } else {
                jdbcClient.sql("""
                    UPDATE system_users
                    SET failed_attempts = :attempts
                    WHERE id = :id
                """)
                .param("attempts", newFailedAttempts)
                .param("id", user.getId())
                .update();

                int remaining = 5 - newFailedAttempts;
                securityAuditService.logFailedLogin(username, clientIp, "Hatalı şifre (Kalan deneme hakkı: " + remaining + ")");
                throw new ApiException(HttpStatus.UNAUTHORIZED,
                    String.format("Kullanıcı adı veya şifre hatalı. Kalan deneme hakkınız: %d.", remaining));
            }
        }
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = "anonim";
        String fullName = "Bilinmiyor";
        if (auth != null && auth.getPrincipal() instanceof SystemUserDetails userDetails) {
            username = userDetails.getUsername();
            fullName = userDetails.getFullName();
        }

        securityAuditService.logLogout(username, fullName, httpRequest.getRemoteAddr());

        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();

        return Map.of("status", "logged_out", "message", "Oturum başarıyla sonlandırıldı.");
    }

    @GetMapping("/me")
    public UserSession currentSession(HttpServletRequest httpRequest) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof SystemUserDetails userDetails)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Oturum bulunamadı veya süresi doldu.");
        }

        HttpSession session = httpRequest.getSession(false);
        String sessionId = session != null ? session.getId() : null;
        return authService.toUserSession(userDetails, sessionId);
    }

    @PostMapping("/change-password")
    public Map<String, Object> changePassword(@RequestBody ChangePasswordRequest request, HttpServletRequest httpRequest) {
        if (request == null || request.currentPassword() == null || request.newPassword() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mevcut şifre ve yeni şifre alanları zorunludur.");
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof SystemUserDetails userDetails)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Bu işlem için oturum açmış olmanız gerekmektedir.");
        }

        if (!passwordEncoder.matches(request.currentPassword(), userDetails.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mevcut şifreniz hatalıdır.");
        }

        String newPassword = request.newPassword() != null ? request.newPassword().trim() : "";
        PasswordPolicyValidator.validate(newPassword, userDetails.getUsername());

        if (passwordEncoder.matches(newPassword, userDetails.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yeni şifre mevcut şifrenizle aynı olamaz.");
        }

        String newHash = passwordEncoder.encode(newPassword);

        // Veritabanında güncelle
        jdbcClient.sql("""
            UPDATE system_users
            SET password_hash = :hash,
                must_change_password = 0,
                failed_attempts = 0,
                locked_until = NULL
            WHERE id = :id
        """)
        .param("hash", newHash)
        .param("id", userDetails.getId())
        .update();

        // Oturumdaki principal'ı güncelle
        userDetails.setMustChangePassword(false);
        userDetails.getSystemUser().setPasswordHash(newHash);

        securityAuditService.logPasswordChanged(userDetails.getUsername(), userDetails.getFullName(), httpRequest.getRemoteAddr());

        return Map.of(
            "status", "ok",
            "message", "Şifreniz başarıyla güncellendi. Artık sistemi tam yetkiyle kullanabilirsiniz."
        );
    }
}
