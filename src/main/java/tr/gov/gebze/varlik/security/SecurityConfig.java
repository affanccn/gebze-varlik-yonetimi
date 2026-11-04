package tr.gov.gebze.varlik.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
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
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final SecurityAuditService securityAuditService;
    private final CustomAuthenticationEntryPoint authenticationEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;
    private final JdbcClient jdbcClient;

    @Value("${app.security.hsts.enabled:false}")
    private boolean hstsEnabled;

    @Value("${app.security.cookie.secure:false}")
    private boolean cookieSecure;

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

        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfTokenRepository.setCookieCustomizer(builder -> {
            builder.sameSite("Lax");
            if (cookieSecure) {
                builder.secure(true);
            }
        });

        http
            // 1. SPA CSRF YAPILANDIRMASI (Logout dahil korunur, Login muaf tutulur)
            .csrf(csrf -> csrf
                .csrfTokenRepository(csrfTokenRepository)
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
            // 4. GÜVENLİK BAŞLIKLARI (CSP, X-Content-Type-Options, Referrer, Permissions, HSTS)
            .headers(headers -> {
                headers.contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
                );
                headers.contentTypeOptions(Customizer.withDefaults());
                headers.referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                );
                headers.frameOptions(frame -> frame.deny());
                headers.permissionsPolicy(permissions -> permissions
                    .policy("camera=(), microphone=(), geolocation=()")
                );
                if (hstsEnabled) {
                    headers.httpStrictTransportSecurity(hsts -> hsts
                        .includeSubDomains(true)
                        .maxAgeInSeconds(31536000)
                    );
                } else {
                    headers.httpStrictTransportSecurity(hsts -> hsts.disable());
                }
            })
            // 5. URL YETKİLENDİRME KURALLARI
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/", "/index.html", "/app-assets/**", "/assets/**", "/css/**", "/js/**", "/images/**", "/favicon.ico", "/vite.svg"
                ).permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/demo-users").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/actuator/**").denyAll()
                .requestMatchers("/api/olmayan").permitAll()
                .requestMatchers("/api/users/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            // 6. ÖZEL GÜVENLİK FİLTRELERİ
            .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
            .addFilterAfter(new ReadOnlyRoleFilter(securityAuditService), CsrfCookieFilter.class)
            .addFilterAfter(new MustChangePasswordFilter(), ReadOnlyRoleFilter.class)
            .addFilterAfter(new UserActiveFilter(jdbcClient), MustChangePasswordFilter.class);

        return http.build();
    }
}
