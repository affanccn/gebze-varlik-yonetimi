package tr.gov.gebze.varlik.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class UserActiveFilter extends OncePerRequestFilter {

    private final JdbcClient jdbcClient;

    public UserActiveFilter(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        if (uri.startsWith("/api/") && !uri.equals("/api/auth/login") && !uri.equals("/api/auth/demo-users")) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof SystemUserDetails userDetails) {
                Integer isActive = jdbcClient.sql("SELECT is_active FROM system_users WHERE id = :id")
                        .param("id", userDetails.getId())
                        .query(Integer.class)
                        .optional()
                        .orElse(0);

                if (isActive == null || isActive == 0) {
                    SecurityContextHolder.clearContext();
                    HttpSession session = request.getSession(false);
                    if (session != null) {
                        session.invalidate();
                    }
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write(
                            "{\"error\":\"Kullanıcı hesabınız devre dışı bırakılmıştır. Oturumunuz sonlandırıldı.\",\"code\":\"ACCOUNT_DEACTIVATED\",\"status\":401}"
                    );
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}

