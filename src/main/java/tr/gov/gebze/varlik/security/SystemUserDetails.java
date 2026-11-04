package tr.gov.gebze.varlik.security;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class SystemUserDetails implements UserDetails {

    private final SystemUser systemUser;
    private final List<GrantedAuthority> authorities;

    public SystemUserDetails(SystemUser systemUser) {
        this.systemUser = systemUser;
        String roleName = systemUser.getRole() != null ? systemUser.getRole().toUpperCase() : "VIEWER";
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + roleName));
    }

    public SystemUser getSystemUser() {
        return systemUser;
    }

    public Long getId() {
        return systemUser.getId();
    }

    public String getFullName() {
        return systemUser.getFullName();
    }

    public String getEmail() {
        return systemUser.getEmail();
    }

    public String getRole() {
        return systemUser.getRole();
    }

    public Long getDepartmentId() {
        return systemUser.getDepartmentId();
    }

    public Long getPersonnelId() {
        return systemUser.getPersonnelId();
    }

    public boolean isMustChangePassword() {
        return systemUser.isMustChangePassword();
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.systemUser.setMustChangePassword(mustChangePassword);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return systemUser.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return systemUser.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    public int getFailedAttempts() {
        return systemUser.getFailedAttempts();
    }

    public java.time.LocalDateTime getLockedUntil() {
        return systemUser.getLockedUntil();
    }

    public boolean isAccountLocked() {
        return systemUser.isAccountLocked();
    }

    @Override
    public boolean isAccountNonLocked() {
        return !systemUser.isAccountLocked();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return systemUser.isActive();
    }
}
