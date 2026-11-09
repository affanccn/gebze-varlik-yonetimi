package tr.gov.gebze.varlik.security;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Giriş uç noktası (/api/auth/login) için IP + Kullanıcı Adı bazlı hız sınırlayıcı (Rate Limiter).
 * Kurum içi NAT proxy arkasındaki personelin toplu kilitlenmesini engellemek için
 * kısıtlamayı doğrudan (IP, Kullanıcı Adı) ikilisi üzerinden uygular.
 */
@Component
public class LoginRateLimiter {

    private static final Logger logger = LoggerFactory.getLogger(LoginRateLimiter.class);

    // Kullanıcı + IP ikilisi için 1 dakikada maksimum 5 başarısız deneme
    private static final int MAX_ATTEMPTS_PER_PAIR = 5;
    // Tek bir IP'den 1 dakikada maksimum 25 deneme (parola püskürtme / spray saldırısı savunması)
    private static final int MAX_ATTEMPTS_PER_IP = 25;
    // Zaman penceresi: 60 saniye
    private static final long WINDOW_MS = 60_000L;

    private static class AttemptWindow {
        final long windowStart;
        final AtomicInteger count = new AtomicInteger(0);

        AttemptWindow(long now) {
            this.windowStart = now;
        }

        boolean isExpired(long now) {
            return now - windowStart > WINDOW_MS;
        }
    }

    private final ConcurrentHashMap<String, AttemptWindow> pairAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AttemptWindow> ipAttempts = new ConcurrentHashMap<>();

    /**
     * İstek yapılmadan önce hız sınırını kontrol eder.
     * @return true if allowed, false if rate limited (429)
     */
    public boolean isAllowed(String clientIp, String username) {
        cleanExpiredEntries();

        long now = System.currentTimeMillis();
        String pairKey = clientIp + ":" + (username != null ? username.trim().toLowerCase() : "");

        // 1. IP seviyesinde püskürtme kontrolü
        AttemptWindow ipWin = ipAttempts.get(clientIp);
        if (ipWin != null && !ipWin.isExpired(now) && ipWin.count.get() >= MAX_ATTEMPTS_PER_IP) {
            logger.warn("Giriş hız sınırı aşıldı (IP Püskürtme Koruması): IP={}", clientIp);
            return false;
        }

        // 2. IP + Kullanıcı Adı ikilisi kontrolü
        AttemptWindow pairWin = pairAttempts.get(pairKey);
        if (pairWin != null && !pairWin.isExpired(now) && pairWin.count.get() >= MAX_ATTEMPTS_PER_PAIR) {
            logger.warn("Giriş hız sınırı aşıldı (Kullanıcı+IP Koruması): IP={}, User={}", clientIp, username);
            return false;
        }

        return true;
    }

    /**
     * Başarısız denemeyi kaydeder.
     */
    public void recordFailedAttempt(String clientIp, String username) {
        long now = System.currentTimeMillis();
        String pairKey = clientIp + ":" + (username != null ? username.trim().toLowerCase() : "");

        // IP kaydı
        ipAttempts.compute(clientIp, (k, existing) -> {
            if (existing == null || existing.isExpired(now)) {
                AttemptWindow nw = new AttemptWindow(now);
                nw.count.incrementAndGet();
                return nw;
            }
            existing.count.incrementAndGet();
            return existing;
        });

        // Pair kaydı
        pairAttempts.compute(pairKey, (k, existing) -> {
            if (existing == null || existing.isExpired(now)) {
                AttemptWindow nw = new AttemptWindow(now);
                nw.count.incrementAndGet();
                return nw;
            }
            existing.count.incrementAndGet();
            return existing;
        });
    }

    /**
     * Başarılı girişte kullanıcının sayacını sıfırlar.
     */
    public void recordSuccess(String clientIp, String username) {
        String pairKey = clientIp + ":" + (username != null ? username.trim().toLowerCase() : "");
        pairAttempts.remove(pairKey);
    }

    /**
     * Testler için sıfırlama.
     */
    public void reset() {
        pairAttempts.clear();
        ipAttempts.clear();
    }

    private void cleanExpiredEntries() {
        long now = System.currentTimeMillis();
        pairAttempts.entrySet().removeIf(e -> e.getValue().isExpired(now));
        ipAttempts.entrySet().removeIf(e -> e.getValue().isExpired(now));
    }
}

