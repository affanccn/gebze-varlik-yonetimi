package tr.gov.gebze.varlik.common;

import java.util.List;
import java.util.Map;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import tr.gov.gebze.varlik.security.SystemUserDetails;

@Service
public class AuthService {

    private final Environment environment;

    public AuthService(Environment environment) {
        this.environment = environment;
    }

    public record DemoAccount(
            String username,
            String fullName,
            String role,
            String roleLabel,
            String unit,
            boolean canWrite,
            boolean canDelete
    ) {
    }

    private static final List<DemoAccount> DEMO_ACCOUNTS = List.of(
            new DemoAccount(
                    "admin",
                    "Sistem Yöneticisi",
                    "ADMIN",
                    "Sistem Yöneticisi",
                    "Belediye Geneli",
                    true,
                    true
            ),
            new DemoAccount(
                    "fen_isleri_mudur",
                    "Fen İşleri Müdürü",
                    "DEPT_MANAGER",
                    "Müdürlük Yöneticisi",
                    "Fen İşleri Müdürlüğü",
                    true,
                    false
            ),
            new DemoAccount(
                    "saha_personel",
                    "Fatih Koç",
                    "STAFF",
                    "Birim Personeli",
                    "Fen İşleri Müdürlüğü",
                    false,
                    false
            ),
            new DemoAccount(
                    "ic_denetci",
                    "İç Denetim Uzmanı",
                    "AUDITOR",
                    "İç Denetçi (Salt Okunur)",
                    "Teftiş Kurulu",
                    false,
                    false
            ),
            new DemoAccount(
                    "kurum_izleyici",
                    "Kurum İzleyicisi",
                    "VIEWER",
                    "Kurum İzleyicisi (Salt Okunur)",
                    "Genel Gözlemci",
                    false,
                    false
            )
    );

    public List<Map<String, Object>> getPublicDemoAccounts() {
        if (environment.acceptsProfiles(Profiles.of("prod")) || !environment.acceptsProfiles(Profiles.of("dev"))) {
            return List.of();
        }
        return DEMO_ACCOUNTS.stream()
                .map(acc -> Map.<String, Object>of(
                        "username", acc.username(),
                        "fullName", acc.fullName(),
                        "role", acc.role(),
                        "roleLabel", acc.roleLabel(),
                        "unit", acc.unit(),
                        "canWrite", acc.canWrite(),
                        "canDelete", acc.canDelete()
                ))
                .toList();
    }

    public UserSession getCurrentUserSession() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof SystemUserDetails userDetails)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Oturum bilgisi bulunamadı. Lütfen giriş yapın.");
        }
        return toUserSession(userDetails, null);
    }

    public UserSession requireSession(String token) {
        return getCurrentUserSession();
    }

    public UserSession requireWriteAccess(String token) {
        UserSession session = requireSession(token);
        if (!session.canWrite()) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Bu işlem için yazma yetkiniz bulunmuyor (" + session.roleLabel() + ").");
        }
        return session;
    }

    public UserSession requireAdmin(String token) {
        return requireDeleteAccess(token);
    }

    public UserSession requireDeleteAccess(String token) {
        UserSession session = requireSession(token);
        if (!session.canDelete()) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Silme / düşüm işlemi yalnızca Sistem Yöneticisi (ADMIN) rolü tarafından yapılabilir.");
        }
        return session;
    }

    public UserSession toUserSession(SystemUserDetails userDetails, String sessionId) {
        String role = userDetails.getRole() != null ? userDetails.getRole().toUpperCase() : "VIEWER";
        boolean canWrite = "ADMIN".equals(role) || "DEPT_MANAGER".equals(role);
        boolean canDelete = "ADMIN".equals(role);

        String roleLabel = switch (role) {
            case "ADMIN" -> "Sistem Yöneticisi";
            case "DEPT_MANAGER" -> "Müdürlük Yöneticisi";
            case "STAFF" -> "Müdürlük Personeli";
            case "AUDITOR" -> "İç Denetçi (Salt Okunur)";
            case "VIEWER" -> "Kurum İzleyicisi (Salt Okunur)";
            default -> "Kullanıcı";
        };

        String unit = "Belediye Geneli";
        if (userDetails.getDepartmentId() != null) {
            unit = "Müdürlük #" + userDetails.getDepartmentId();
        }

        return new UserSession(
                userDetails.getUsername(),
                userDetails.getFullName(),
                role,
                roleLabel,
                unit,
                canWrite,
                canDelete,
                sessionId,
                userDetails.getDepartmentId(),
                userDetails.getPersonnelId(),
                userDetails.isMustChangePassword(),
                userDetails.getEmail()
        );
    }
}
