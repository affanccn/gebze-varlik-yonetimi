package tr.gov.gebze.varlik.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
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
import tr.gov.gebze.varlik.security.SecurityAuditService;
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

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, request.password())
            );

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
            securityAuditService.logFailedLogin(username, clientIp, ex instanceof BadCredentialsException ? "Hatalı şifre" : ex.getMessage());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Kullanıcı adı veya şifre hatalı.");
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

        String newPassword = request.newPassword().trim();
        if (newPassword.length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yeni şifre en az 8 karakter uzunluğunda olmalıdır.");
        }

        if (passwordEncoder.matches(newPassword, userDetails.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yeni şifre mevcut şifrenizle aynı olamaz.");
        }

        String newHash = passwordEncoder.encode(newPassword);

        // Veritabanında güncelle
        jdbcClient.sql("""
            UPDATE system_users
            SET password_hash = :hash,
                must_change_password = 0
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
