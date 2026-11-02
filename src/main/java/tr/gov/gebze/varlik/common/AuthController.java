package tr.gov.gebze.varlik.common;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(String username, String password) {
    }

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/demo-users")
    public List<Map<String, Object>> getDemoUsers() {
        return authService.getPublicDemoAccounts();
    }

    @PostMapping("/login")
    public UserSession login(@RequestBody LoginRequest request) {
        return authService.login(request.username(), request.password());
    }

    @PostMapping("/logout")
    public Map<String, String> logout(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        authService.logout(token);
        return Map.of("status", "logged_out");
    }

    @GetMapping("/me")
    public UserSession currentSession(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        return authService.requireSession(token);
    }
}

