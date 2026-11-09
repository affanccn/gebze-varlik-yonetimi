package tr.gov.gebze.varlik.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
            // 5. URL YETKİLENDİRME KURALLARI (Açık ve Yöntem/Yol/Rol Bazlı Kurallar)
            .authorizeHttpRequests(auth -> auth
                // 5.1. Statik Kaynaklar & Sağlık & Genel Erişim
                .requestMatchers(
                    "/", "/index.html", "/app-assets/**", "/assets/**", "/css/**", "/js/**", "/images/**", "/favicon.ico", "/vite.svg"
                ).permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/demo-users").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/actuator/**").denyAll()

                // 5.2. Kimliği Doğrulanmış Ortak Uç Noktalar
                .requestMatchers(HttpMethod.POST, "/api/auth/logout").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/auth/change-password").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/dashboard").hasAnyRole("ADMIN", "DEPT_MANAGER", "STAFF", "AUDITOR", "VIEWER")

                // 5.3. Kullanıcı Yönetimi (/api/users/**)
                .requestMatchers(HttpMethod.GET, "/api/users", "/api/users/*").hasAnyRole("ADMIN", "AUDITOR")
                .requestMatchers("/api/users", "/api/users/**").hasRole("ADMIN")

                // 5.4. Sistem Ayarları (/api/settings/**)
                .requestMatchers(HttpMethod.GET, "/api/settings").hasAnyRole("ADMIN", "AUDITOR")
                .requestMatchers(HttpMethod.POST, "/api/settings").hasRole("ADMIN")

                // 5.5. Hiyerarşi & Teşkilat Yönetimi
                .requestMatchers(HttpMethod.GET, "/api/hierarchy/tree").hasAnyRole("ADMIN", "DEPT_MANAGER", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.GET, "/api/rooms/*/assets").hasAnyRole("ADMIN", "DEPT_MANAGER", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.GET,
                    "/api/departments", "/api/departments/*",
                    "/api/sub-units", "/api/sub-units/*",
                    "/api/buildings", "/api/buildings/*",
                    "/api/floors", "/api/floors/*",
                    "/api/rooms", "/api/rooms/*", "/api/rooms/qr/*",
                    "/api/categories"
                ).hasAnyRole("ADMIN", "DEPT_MANAGER", "STAFF", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.POST, "/api/rooms").hasAnyRole("ADMIN", "DEPT_MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/rooms/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/rooms/*").hasRole("ADMIN")
                .requestMatchers(
                    "/api/departments", "/api/departments/**",
                    "/api/sub-units", "/api/sub-units/**",
                    "/api/buildings", "/api/buildings/**",
                    "/api/floors", "/api/floors/**"
                ).hasRole("ADMIN")

                // 5.6. Personel Modülü (/api/personnel/**)
                .requestMatchers(HttpMethod.GET, "/api/personnel/export-template").hasAnyRole("ADMIN", "DEPT_MANAGER")
                .requestMatchers(HttpMethod.POST, "/api/personnel/import/validate", "/api/personnel/import/commit").hasAnyRole("ADMIN", "DEPT_MANAGER")
                .requestMatchers(HttpMethod.GET, "/api/personnel", "/api/personnel/*").hasAnyRole("ADMIN", "DEPT_MANAGER", "STAFF", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.POST, "/api/personnel").hasAnyRole("ADMIN", "DEPT_MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/personnel/*").hasAnyRole("ADMIN", "DEPT_MANAGER")
                .requestMatchers(HttpMethod.DELETE, "/api/personnel/*").hasAnyRole("ADMIN", "DEPT_MANAGER")

                // 5.7. Kurumsal Modüller (Stok, Filo, Satın Alma, Sayım, Belge, Denetim İzi, Raporlar, Uyarılar)
                .requestMatchers(HttpMethod.GET, "/api/audit-logs").hasAnyRole("ADMIN", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.GET,
                    "/api/stock", "/api/stock/transactions",
                    "/api/fleet",
                    "/api/procurement",
                    "/api/audits", "/api/audits/*/scans", "/api/audits/*/reconciliation",
                    "/api/documents",
                    "/api/reports/depreciation", "/api/reports/disposal", "/api/reports/export", "/api/reports/form13",
                    "/api/alerts"
                ).hasAnyRole("ADMIN", "DEPT_MANAGER", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.POST, "/api/stock/transactions").hasAnyRole("ADMIN", "DEPT_MANAGER")
                .requestMatchers(HttpMethod.POST, "/api/fleet/*/status").hasAnyRole("ADMIN", "DEPT_MANAGER")
                .requestMatchers(HttpMethod.POST, "/api/audits/*/scan").hasAnyRole("ADMIN", "DEPT_MANAGER")

                // 5.8. Varlıklar (Assets)
                .requestMatchers(HttpMethod.GET, "/api/assets/export").hasAnyRole("ADMIN", "DEPT_MANAGER", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.GET, "/api/assets/export-template").hasAnyRole("ADMIN", "DEPT_MANAGER")
                .requestMatchers(HttpMethod.POST, "/api/assets/import/validate", "/api/assets/import/commit").hasAnyRole("ADMIN", "DEPT_MANAGER")
                .requestMatchers(HttpMethod.GET, "/api/assets", "/api/assets/*", "/api/assets/*/transitions", "/api/assets/lookup").hasAnyRole("ADMIN", "DEPT_MANAGER", "STAFF", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.DELETE, "/api/assets/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/assets", "/api/assets/*/transfer", "/api/assets/*/transition").hasAnyRole("ADMIN", "DEPT_MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/assets/*").hasAnyRole("ADMIN", "DEPT_MANAGER")

                // 5.9. Zimmet (Assignments)
                .requestMatchers(HttpMethod.GET, "/api/assignments").hasAnyRole("ADMIN", "DEPT_MANAGER", "STAFF", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.POST, "/api/assignments", "/api/assignments/*/return").hasAnyRole("ADMIN", "DEPT_MANAGER")

                // 5.10. Bakım & Onarım (Maintenances)
                .requestMatchers(HttpMethod.GET, "/api/maintenances/*/work-order").hasAnyRole("ADMIN", "DEPT_MANAGER", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.GET, "/api/maintenances", "/api/maintenances/*").hasAnyRole("ADMIN", "DEPT_MANAGER", "STAFF", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.POST, "/api/maintenances", "/api/maintenances/*/complete").hasAnyRole("ADMIN", "DEPT_MANAGER")

                // 5.11. Hareketler (Movements)
                .requestMatchers(HttpMethod.GET, "/api/movements").hasAnyRole("ADMIN", "DEPT_MANAGER", "STAFF", "AUDITOR", "VIEWER")
                .requestMatchers(HttpMethod.POST, "/api/movements").hasAnyRole("ADMIN", "DEPT_MANAGER")

                // 5.12. VARSAYILAN KURAL (Deny-By-Default): Eşleşmeyen tüm /api/** istekleri REDDEDİLİR!
                .requestMatchers("/api/**").denyAll()

                // SPA Yönlendirmesi
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
