package tr.gov.gebze.varlik.security;

import java.time.OffsetDateTime;

public class SystemUser {
    private Long id;
    private String username;
    private String passwordHash;
    private String fullName;
    private String email;
    private String role;
    private Long departmentId;
    private Long personnelId;
    private boolean mustChangePassword;
    private boolean isActive;
    private int failedAttempts;
    private java.time.LocalDateTime lockedUntil;
    private OffsetDateTime createdAt;

    public SystemUser() {}

    public SystemUser(Long id, String username, String passwordHash, String fullName, String email, 
                      String role, Long departmentId, Long personnelId, boolean mustChangePassword, 
                      boolean isActive, OffsetDateTime createdAt) {
        this.id = id;
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
        this.departmentId = departmentId;
        this.personnelId = personnelId;
        this.mustChangePassword = mustChangePassword;
        this.isActive = isActive;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }

    public Long getPersonnelId() { return personnelId; }
    public void setPersonnelId(Long personnelId) { this.personnelId = personnelId; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public int getFailedAttempts() { return failedAttempts; }
    public void setFailedAttempts(int failedAttempts) { this.failedAttempts = failedAttempts; }

    public java.time.LocalDateTime getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(java.time.LocalDateTime lockedUntil) { this.lockedUntil = lockedUntil; }

    public boolean isAccountLocked() {
        return lockedUntil != null && lockedUntil.isAfter(java.time.LocalDateTime.now());
    }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isAdmin() { return "ADMIN".equalsIgnoreCase(role); }
    public boolean isDeptManager() { return "DEPT_MANAGER".equalsIgnoreCase(role); }
    public boolean isStaff() { return "STAFF".equalsIgnoreCase(role); }
    public boolean isAuditor() { return "AUDITOR".equalsIgnoreCase(role); }
    public boolean isViewer() { return "VIEWER".equalsIgnoreCase(role); }
    public boolean isReadOnly() { return isAuditor() || isViewer(); }
}
