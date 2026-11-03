package tr.gov.gebze.varlik.common;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    public record DemoAccount(
            String username,
            String password,
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
                    "demo123",
                    "Sistem Yöneticisi (Demo)",
                    "ADMIN",
                    "Sistem Yöneticisi",
                    "Bilgi İşlem Müdürlüğü (Demo)",
                    true,
                    true
            ),
            new DemoAccount(
                    "tasinir",
                    "demo123",
                    "Taşınır Kayıt Yetkilisi (Demo)",
                    "MANAGER",
                    "Taşınır Kayıt ve Kontrol Yetkilisi",
                    "Destek Hizmetleri Müdürlüğü (Demo)",
                    true,
                    false
            ),
            new DemoAccount(
                    "uzman",
                    "demo123",
                    "Birim Gözlemcisi (Demo)",
                    "VIEWER",
                    "Birim Sorumlusu (Salt Okunur)",
                    "İdari İşler Birimi (Demo)",
                    false,
                    false
            )
    );

    private final Map<String, UserSession> activeSessions = new ConcurrentHashMap<>();

    public List<Map<String, Object>> getPublicDemoAccounts() {
        return DEMO_ACCOUNTS.stream()
                .map(acc -> Map.<String, Object>of(
                        "username", acc.username(),
                        "password", acc.password(),
                        "fullName", acc.fullName(),
                        "role", acc.role(),
                        "roleLabel", acc.roleLabel(),
                        "unit", acc.unit(),
                        "canWrite", acc.canWrite(),
                        "canDelete", acc.canDelete()
                ))
                .toList();
    }

    public UserSession login(String username, String password) {
        if (username == null || username.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Kullanıcı adı boş bırakılamaz.");
        }
        String normalized = username.trim().toLowerCase();
        DemoAccount matched = DEMO_ACCOUNTS.stream()
                .filter(acc -> acc.username().equalsIgnoreCase(normalized) && acc.password().equals(password))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Geçersiz kullanıcı adı veya parola."));

        String token = UUID.randomUUID().toString();
        UserSession session = new UserSession(
                matched.username(),
                matched.fullName(),
                matched.role(),
                matched.roleLabel(),
                matched.unit(),
                matched.canWrite(),
                matched.canDelete(),
                token
        );
        activeSessions.put(token, session);
        return session;
    }

    public void logout(String token) {
        if (token != null) {
            activeSessions.remove(token);
        }
    }

    public UserSession requireSession(String token) {
        if (token == null || token.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Oturum bilgisi bulunamadı. Lütfen giriş yapın.");
        }
        UserSession session = activeSessions.get(token);
        if (session == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Oturumunuz sona erdi veya geçersiz. Lütfen tekrar giriş yapın.");
        }
        return session;
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
                    "Silme / düşüm işlemi yalnızca Sistem Yöneticisi rolü tarafından yapılabilir.");
        }
        return session;
    }
}

