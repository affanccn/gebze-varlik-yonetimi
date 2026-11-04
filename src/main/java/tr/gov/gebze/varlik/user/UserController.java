package tr.gov.gebze.varlik.user;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import tr.gov.gebze.varlik.common.ApiException;
import tr.gov.gebze.varlik.security.SystemUserDetails;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> listUsers(
            @RequestParam(required = false) String role,
            @RequestParam(name = "department_id", required = false) Long departmentId,
            @RequestParam(name = "is_active", required = false) Boolean isActive
    ) {
        return userService.listUsers(role, departmentId, isActive);
    }

    @GetMapping("/{id}")
    public UserResponse getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@RequestBody UserCreateRequest request, HttpServletRequest httpRequest) {
        SystemUserDetails admin = getCurrentAdmin();
        return userService.createUser(request, admin.getUsername(), httpRequest.getRemoteAddr());
    }

    @PutMapping("/{id}")
    public UserResponse updateUser(@PathVariable Long id, @RequestBody UserUpdateRequest request, HttpServletRequest httpRequest) {
        SystemUserDetails admin = getCurrentAdmin();
        return userService.updateUser(id, request, admin.getUsername(), admin.getId(), httpRequest.getRemoteAddr());
    }

    @PostMapping("/{id}/deactivate")
    public UserResponse deactivateUser(@PathVariable Long id, HttpServletRequest httpRequest) {
        SystemUserDetails admin = getCurrentAdmin();
        return userService.deactivateUser(id, admin.getUsername(), admin.getId(), httpRequest.getRemoteAddr());
    }

    @PostMapping("/{id}/reset-password")
    public UserResetPasswordResponse resetPassword(@PathVariable Long id, HttpServletRequest httpRequest) {
        SystemUserDetails admin = getCurrentAdmin();
        return userService.resetPassword(id, admin.getUsername(), httpRequest.getRemoteAddr());
    }

    private SystemUserDetails getCurrentAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof SystemUserDetails userDetails)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Oturum açmış yönetici bulunamadı.");
        }
        if (!"ADMIN".equalsIgnoreCase(userDetails.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bu işlem yalnızca Sistem Yöneticisi (ADMIN) tarafından yapılabilir.");
        }
        return userDetails;
    }
}

