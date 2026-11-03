package tr.gov.gebze.varlik.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    private final SecurityAuditService securityAuditService;

    public CustomAccessDeniedHandler(SecurityAuditService securityAuditService) {
        this.securityAuditService = securityAuditService;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
            throws IOException {
        String username = "anonim";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            username = auth.getName();
        }

        String uri = request.getRequestURI();
        String method = request.getMethod();
        String clientIp = request.getRemoteAddr();

        securityAuditService.logAccessDenied(
            username, clientIp, method, uri, 
            accessDeniedException.getMessage() != null ? accessDeniedException.getMessage() : "Yetkisiz erişim"
        );

        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
            "{\"error\":\"Bu işlem için yetkiniz bulunmamaktadır.\",\"status\":403}"
        );
    }
}
