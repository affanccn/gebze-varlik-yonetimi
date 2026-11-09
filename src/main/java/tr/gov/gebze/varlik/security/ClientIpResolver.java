package tr.gov.gebze.varlik.security;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Kurumsal ters vekil (Reverse Proxy / WAF) ve güvenilir istemci IP çözümleyici.
 * Yalnızca tanımlı TRUSTED_PROXIES IP/CIDR aralıklarından gelen X-Forwarded-For başlıklarına güvenir.
 * Doğrudan bağlanan veya güvenilmeyen istemcilerin sahte X-Forwarded-For başlıklarını yok sayar.
 */
@Component
public class ClientIpResolver {

    private static final Logger logger = LoggerFactory.getLogger(ClientIpResolver.class);

    // Varsayılan güvenilen yerel ve özel ağ aralıkları: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, ::1
    public static final String DEFAULT_TRUSTED_PROXIES =
            "127.0.0.1,::1,127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16";

    private final List<IpMatcher> trustedMatchers = new ArrayList<>();

    public ClientIpResolver(@Value("${app.security.trusted-proxies:${TRUSTED_PROXIES:" + DEFAULT_TRUSTED_PROXIES + "}}") String trustedProxiesConfig) {
        configureTrustedProxies(trustedProxiesConfig);
    }

    public synchronized void configureTrustedProxies(String config) {
        trustedMatchers.clear();
        if (config == null || config.isBlank()) {
            config = DEFAULT_TRUSTED_PROXIES;
        }
        String[] parts = config.split("[,; ]+");
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                try {
                    trustedMatchers.add(new IpMatcher(trimmed));
                } catch (Exception e) {
                    logger.warn("Güvenilir proxy tanımı çözümlenemedi: {} (Hata: {})", trimmed, e.getMessage());
                }
            }
        }
        logger.info("ClientIpResolver yapılandırıldı. Toplam güvenilir kural: {}", trustedMatchers.size());
    }

    /**
     * HTTP isteğinden güvenli istemci IP adresini çözer.
     */
    public String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return "127.0.0.1";
        }

        String socketIp = request.getRemoteAddr();
        if (socketIp == null || socketIp.isBlank()) {
            socketIp = "127.0.0.1";
        }

        // Eğer soket IP'si güvenilen bir ters vekil / ağ aralığından gelmiyorsa başlığa ASLA güvenme!
        if (!isTrustedProxy(socketIp)) {
            return normalizeIp(socketIp);
        }

        // Güvenilen proxy'den geliyorsa X-Forwarded-For veya X-Real-IP oku
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // X-Forwarded-For: client, proxy1, proxy2
            // İlk IP gerçek istemci IP'sidir
            String[] ips = xff.split(",");
            if (ips.length > 0) {
                String candidate = ips[0].trim();
                if (isValidIp(candidate)) {
                    return normalizeIp(candidate);
                }
            }
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank() && isValidIp(xRealIp.trim())) {
            return normalizeIp(xRealIp.trim());
        }

        return normalizeIp(socketIp);
    }

    public boolean isTrustedProxy(String ip) {
        if (ip == null || ip.isBlank()) return false;
        String cleanIp = normalizeIp(ip);
        for (IpMatcher matcher : trustedMatchers) {
            if (matcher.matches(cleanIp)) {
                return true;
            }
        }
        return false;
    }

    private static String normalizeIp(String ip) {
        if ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) {
            return "127.0.0.1";
        }
        return ip.trim();
    }

    private static boolean isValidIp(String ip) {
        if (ip == null || ip.isBlank() || ip.length() > 45) return false;
        try {
            InetAddress.getByName(ip);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * IP veya CIDR eşleştirici yardımcı sınıfı.
     */
    public static class IpMatcher {
        private final String raw;
        private final boolean isCidr;
        private byte[] networkBytes;
        private int prefixLength;

        public IpMatcher(String definition) throws Exception {
            this.raw = definition.trim();
            if (raw.contains("/")) {
                this.isCidr = true;
                String[] parts = raw.split("/");
                InetAddress addr = InetAddress.getByName(parts[0]);
                this.networkBytes = addr.getAddress();
                this.prefixLength = Integer.parseInt(parts[1]);
            } else {
                this.isCidr = false;
                InetAddress addr = InetAddress.getByName(raw);
                this.networkBytes = addr.getAddress();
                this.prefixLength = networkBytes.length * 8;
            }
        }

        public boolean matches(String ip) {
            try {
                InetAddress addr = InetAddress.getByName(ip);
                byte[] targetBytes = addr.getAddress();
                if (targetBytes.length != networkBytes.length) {
                    // IPv4 vs IPv6 uyuşmazlığı
                    return false;
                }
                if (!isCidr) {
                    return raw.equalsIgnoreCase(ip) || java.util.Arrays.equals(networkBytes, targetBytes);
                }

                int fullBytes = prefixLength / 8;
                int remainingBits = prefixLength % 8;

                for (int i = 0; i < fullBytes; i++) {
                    if (networkBytes[i] != targetBytes[i]) {
                        return false;
                    }
                }

                if (remainingBits > 0) {
                    int mask = 0xFF << (8 - remainingBits);
                    return (networkBytes[fullBytes] & mask) == (targetBytes[fullBytes] & mask);
                }

                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }
}

