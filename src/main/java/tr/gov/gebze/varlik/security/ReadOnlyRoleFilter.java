package tr.gov.gebze.varlik.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * AUDITOR ve VIEWER rolleri için GET ve HEAD dışındaki (POST, PUT, DELETE, PATCH)
 * tüm isteklerde güvenlik katmanında tek merkezden 403 Forbidden döner.
 */
public class ReadOnlyRoleFilter extends OncePerRequestFilter {

    private final SecurityAuditService securityAuditService;

    public ReadOnlyRoleFilter(SecurityAuditService securityAuditService) {
        this.securityAuditService = securityAuditService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String method = request.getMethod();
        String uri = request.getRequestURI();

        // GET, HEAD, çıkış (logout) ve şifre değiştirme (change-password) istekleri kısıtlanmaz
        if ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method) ||
                "/api/auth/logout".equalsIgnoreCase(uri) || "/api/auth/change-password".equalsIgnoreCase(uri)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof SystemUserDetails userDetails) {
            String role = userDetails.getRole();
            if ("AUDITOR".equalsIgnoreCase(role) || "VIEWER".equalsIgnoreCase(role) || "STAFF".equalsIgnoreCase(role)) {
                String username = userDetails.getUsername();
                String clientIp = request.getRemoteAddr();

                securityAuditService.logAccessDenied(
                    username, clientIp, method, uri, 
                    "Yazma yetkisi olmayan rol (" + role + ") veri değiştirme işlemi (" + method + ") yapamaz."
                );

                response.setStatus(HttpStatus.FORBIDDEN.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write(
                    "{\"error\":\"Bu rol (" + role + ") veri üzerinde ekleme, silme veya güncelleme yapamaz.\",\"status\":403}"
                );
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
