package tr.gov.gebze.varlik.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * must_change_password=1 olan kullanıcıların şifre değiştirme, oturum sorgusu ve çıkış
 * haricindeki tüm API uç noktalarına erişimini 403 ile engeller.
 */
public class MustChangePasswordFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_PATHS = Set.of(
            "/api/auth/change-password",
            "/api/auth/me",
            "/api/auth/logout"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();

        // Sadece /api/ ile başlayan korumalı rotaları denetle
        if (uri.startsWith("/api/")) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof SystemUserDetails userDetails) {
                if (userDetails.isMustChangePassword()) {
                    boolean isAllowed = ALLOWED_PATHS.stream().anyMatch(uri::equalsIgnoreCase);
                    if (!isAllowed) {
                        response.setStatus(HttpStatus.FORBIDDEN.value());
                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        response.setCharacterEncoding("UTF-8");
                        response.getWriter().write(
                            "{\"error\":\"İlk girişinizde şifrenizi güncellemeniz zorunludur.\",\"code\":\"PASSWORD_CHANGE_REQUIRED\",\"status\":403}"
                        );
                        return;
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
