package tr.gov.gebze.varlik.security;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final JdbcClient jdbcClient;

    public CustomUserDetailsService(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (username == null || username.isBlank()) {
            throw new UsernameNotFoundException("Kullanıcı adı boş bırakılamaz.");
        }

        Optional<SystemUser> userOpt = jdbcClient.sql("""
            SELECT id, username, password_hash, full_name, email, role,
                   department_id, personnel_id, must_change_password, is_active, created_at
            FROM system_users
            WHERE LOWER(username) = LOWER(:username)
        """)
        .param("username", username.trim())
        .query((rs, rowNum) -> {
            SystemUser u = new SystemUser();
            u.setId(rs.getLong("id"));
            u.setUsername(rs.getString("username"));
            u.setPasswordHash(rs.getString("password_hash"));
            u.setFullName(rs.getString("full_name"));
            u.setEmail(rs.getString("email"));
            u.setRole(rs.getString("role"));
            
            long deptId = rs.getLong("department_id");
            u.setDepartmentId(rs.wasNull() ? null : deptId);

            long persId = rs.getLong("personnel_id");
            u.setPersonnelId(rs.wasNull() ? null : persId);

            u.setMustChangePassword(rs.getInt("must_change_password") == 1);
            u.setActive(rs.getInt("is_active") == 1);

            try {
                u.setCreatedAt(rs.getObject("created_at", OffsetDateTime.class));
            } catch (Exception ignored) {}

            return u;
        })
        .optional();

        if (userOpt.isEmpty()) {
            throw new UsernameNotFoundException("Kullanıcı bulunamadı: " + username);
        }

        SystemUser user = userOpt.get();
        if (!user.isActive()) {
            throw new UsernameNotFoundException("Kullanıcı hesabı pasif durumdadır: " + username);
        }

        return new SystemUserDetails(user);
    }
}
