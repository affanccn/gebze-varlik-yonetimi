package tr.gov.gebze.varlik.security;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import tr.gov.gebze.varlik.common.ApiException;

public final class PasswordPolicyValidator {

    private static final int MIN_LENGTH = 10;

    private static final Set<String> WEAK_PASSWORDS = Set.of(
            "123456", "12345678", "123456789", "1234567890", "12345", "1234", "111111", "000000",
            "password", "password123", "pass1234", "qwerty", "qwerty123", "qweasd123", "asdasd123",
            "admin", "admin123", "admin2026", "administrator", "root1234", "superuser",
            "gebze", "gebze2026", "gebze123", "gebze1234", "gebzebelediyesi", "belediye", "belediye2026",
            "kocaeli41", "gebze41", "turkiye", "turkiye2026", "istanbul", "istanbul34", "ankara06",
            "welcome", "welcome1", "letmein", "monkey", "dragon", "master", "sunshine", "football",
            "baseball", "superman", "starwars", "secret", "trustno1", "computer", "internet", "iloveyou",
            "test1234", "demo1234", "changeme", "temp1234", "default123", "user1234", "abc12345", "12345abc"
    );

    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SPECIAL = "!@#$%^&*()_+-=";
    private static final String ALL_CHARS = UPPER + LOWER + DIGITS + SPECIAL;
    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordPolicyValidator() {}

    public static void validate(String password, String username) {
        if (password == null || password.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Şifre boş bırakılamaz.");
        }
        if (password.length() < MIN_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Şifre en az " + MIN_LENGTH + " karakter uzunluğunda olmalıdır.");
        }

        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;

        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) {
                hasUpper = true;
            } else if (Character.isLowerCase(c)) {
                hasLower = true;
            } else if (Character.isDigit(c)) {
                hasDigit = true;
            } else if (!Character.isWhitespace(c)) {
                hasSpecial = true;
            }
        }

        if (!hasUpper) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Şifre en az bir büyük harf içermelidir.");
        }
        if (!hasLower) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Şifre en az bir küçük harf içermelidir.");
        }
        if (!hasDigit) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Şifre en az bir rakam içermelidir.");
        }
        if (!hasSpecial) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Şifre en az bir özel karakter (!@#$%^&*()_+-=[]{}|;:,.<>? vb.) içermelidir.");
        }

        if (username != null && !username.isBlank()) {
            String lowerPass = password.toLowerCase(Locale.ROOT);
            String lowerUser = username.trim().toLowerCase(Locale.ROOT);
            if (lowerPass.contains(lowerUser)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Şifre kullanıcı adını içeremez.");
            }
        }

        String normalized = password.trim().toLowerCase(Locale.ROOT);
        String alphanumericOnly = normalized.replaceAll("[^a-z0-9]", "");
        if (WEAK_PASSWORDS.contains(normalized) || WEAK_PASSWORDS.contains(alphanumericOnly)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Girdiğiniz şifre çok yaygın ve tahmin edilebilir bir şifredir. Lütfen daha güvenli bir şifre seçiniz.");
        }

        for (String weak : Set.of("gebze2026", "belediye2026", "admin2026", "password123", "qwerty123")) {
            if (normalized.contains(weak)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Girdiğiniz şifre belediye veya kurum adını içeren tahmin edilebilir bir şablon içermektedir.");
            }
        }
    }

    public static String generateTemporaryPassword() {
        StringBuilder sb = new StringBuilder(12);
        sb.append(UPPER.charAt(RANDOM.nextInt(UPPER.length())));
        sb.append(LOWER.charAt(RANDOM.nextInt(LOWER.length())));
        sb.append(DIGITS.charAt(RANDOM.nextInt(DIGITS.length())));
        sb.append(SPECIAL.charAt(RANDOM.nextInt(SPECIAL.length())));
        for (int i = 4; i < 12; i++) {
            sb.append(ALL_CHARS.charAt(RANDOM.nextInt(ALL_CHARS.length())));
        }
        char[] chars = sb.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = RANDOM.nextInt(i + 1);
            char temp = chars[i];
            chars[i] = chars[j];
            chars[j] = temp;
        }
        return new String(chars);
    }
}
