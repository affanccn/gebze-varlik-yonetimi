package tr.gov.gebze.varlik.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.SessionManagementConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final SecurityAuditService securityAuditService;
    private final CustomAuthenticationEntryPoint authenticationEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;
    private final JdbcClient jdbcClient;

    public SecurityConfig(SecurityAuditService securityAuditService,
                          CustomAuthenticationEntryPoint authenticationEntryPoint,
                          CustomAccessDeniedHandler accessDeniedHandler,
                          JdbcClient jdbcClient) {
        this.securityAuditService = securityAuditService;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
        this.jdbcClient = jdbcClient;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        SpaCsrfTokenRequestHandler requestHandler = new SpaCsrfTokenRequestHandler();

        http
            // 1. SPA CSRF YAPILANDIRMASI (Logout dahil korunur, Login muaf tutulur)
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(requestHandler)
                .ignoringRequestMatchers("/api/auth/login", "/api/auth/demo-users")
            )
            // 2. SESSION FIXATION KORUMASI
            .sessionManagement(session -> session
                .sessionFixation(SessionManagementConfigurer.SessionFixationConfigurer::changeSessionId)
            )
            // 3. 401 VE 403 HATA İŞLEYİCİLERİ
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            // 4. URL YETKİLENDİRME KURALLARI
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/", "/index.html", "/app-assets/**", "/assets/**", "/css/**", "/js/**", "/images/**", "/favicon.ico", "/vite.svg"
                ).permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/demo-users").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/olmayan").permitAll()
                .requestMatchers("/api/users/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            // 5. ÖZEL GÜVENLİK FİLTRELERİ
            .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
            .addFilterAfter(new ReadOnlyRoleFilter(securityAuditService), CsrfCookieFilter.class)
            .addFilterAfter(new MustChangePasswordFilter(), ReadOnlyRoleFilter.class)
            .addFilterAfter(new UserActiveFilter(jdbcClient), MustChangePasswordFilter.class);

        return http.build();
    }
}
