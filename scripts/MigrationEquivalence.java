import java.sql.*;
import java.util.*;
import java.util.stream.*;
import org.flywaydb.core.Flyway;

/**
 * GEBZE-EKYS — Migrasyon Seti Eşdeğerlik Testi
 *
 * db/migration (V1..V17, geliştirme) ve db/migration-prod (V1..V2, üretim) setlerini
 * iki BOŞ şemaya uygular ve veri sözlüğünü karşılaştırır:
 *   tablolar, sütunlar (tip/uzunluk/null/identity), indeksler (kolon/ifade imzası),
 *   kısıtlar (PK/UK/FK/CHECK), tetikleyiciler, görünümler, sıralar (sequence) ve
 *   resmi taksonomi (müdürlük kodları, kategori adları).
 * Tek beklenen fark: dev'de yerel JSON tipindeki sütunların prod'da CLOB + CHECK (IS JSON) olması.
 *
 * Kullanım: scripts/test_migration_equivalence.ps1 tarafından çağrılır.
 *   java -cp <runtime-classpath> scripts/MigrationEquivalence.java <jdbcUrl> <devUser> <devPw> <prodUser> <prodPw>
 */
public class MigrationEquivalence {

    static final Set<String> IGNORED_TABLES = Set.of("FLYWAY_SCHEMA_HISTORY");

    public static void main(String[] a) throws Exception {
        String url = a[0];
        migrate(url, a[1], a[2], "filesystem:src/main/resources/db/migration");
        migrate(url, a[3], a[4], "filesystem:src/main/resources/db/migration-prod");

        try (Connection dev = DriverManager.getConnection(url, a[1], a[2]);
             Connection prod = DriverManager.getConnection(url, a[3], a[4])) {

            Set<String> jsonCols = jsonColumns(dev);
            System.out.println("Dev'de yerel JSON tipli sütunlar (beklenen fark): " + jsonCols);

            int diffs = 0;
            diffs += compare("TABLOLAR", tables(dev), tables(prod));
            diffs += compare("SÜTUNLAR", columns(dev, jsonCols, true), columns(prod, jsonCols, false));
            diffs += compare("INDEKSLER", indexes(dev), indexes(prod));
            diffs += compare("KISITLAR", constraints(dev, jsonCols, true), constraints(prod, jsonCols, false));
            diffs += compare("TETIKLEYICILER", triggers(dev), triggers(prod));
            diffs += compare("GORUNUMLER", list(dev, "SELECT view_name FROM user_views"), list(prod, "SELECT view_name FROM user_views"));
            diffs += compare("SEQUENCE'LER", list(dev, "SELECT sequence_name FROM user_sequences WHERE sequence_name NOT LIKE 'ISEQ$$%'"),
                    list(prod, "SELECT sequence_name FROM user_sequences WHERE sequence_name NOT LIKE 'ISEQ$$%'"));
            diffs += compare("JSON KISITI (prod CLOB IS JSON)", jsonCols, jsonChecks(prod));
            diffs += compare("RESMI MUDURLUK KODLARI", list(dev, "SELECT code FROM departments WHERE is_active = 1"), list(prod, "SELECT code FROM departments WHERE is_active = 1"));
            diffs += compare("RESMI KATEGORI ADLARI", list(dev, "SELECT name FROM asset_categories"), list(prod, "SELECT name FROM asset_categories"));

            System.out.println();
            if (diffs == 0) {
                System.out.println("SONUC: ESDEGER — iki migrasyon seti ayni semayi uretiyor (yalnizca JSON->CLOB IS JSON farki).");
            } else {
                System.out.println("SONUC: " + diffs + " FARK BULUNDU");
                System.exit(1);
            }
        }
    }

    static void migrate(String url, String user, String pw, String location) {
        var res = Flyway.configure().dataSource(url, user, pw).locations(location)
                .cleanDisabled(true).load().migrate();
        System.out.printf("%-48s -> %s: %d migrasyon uygulandi (hedef surum %s)%n",
                location, user, res.migrationsExecuted, res.targetSchemaVersion);
    }

    static int compare(String title, Set<String> dev, Set<String> prod) {
        Set<String> onlyDev = new TreeSet<>(dev); onlyDev.removeAll(prod);
        Set<String> onlyProd = new TreeSet<>(prod); onlyProd.removeAll(dev);
        boolean ok = onlyDev.isEmpty() && onlyProd.isEmpty();
        System.out.printf("%n[%s] %s — dev=%d, prod=%d%n", ok ? "OK" : "FARK", title, dev.size(), prod.size());
        onlyDev.forEach(s -> System.out.println("   - yalnizca DEV : " + s));
        onlyProd.forEach(s -> System.out.println("   + yalnizca PROD: " + s));
        return onlyDev.size() + onlyProd.size();
    }

    static Set<String> list(Connection c, String sql) throws SQLException {
        Set<String> out = new TreeSet<>();
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) out.add(rs.getString(1));
        }
        return out;
    }

    static Set<String> tables(Connection c) throws SQLException {
        Set<String> t = list(c, "SELECT table_name FROM user_tables WHERE table_name NOT LIKE 'BIN$%'");
        t.removeAll(IGNORED_TABLES);
        return t;
    }

    static Set<String> jsonColumns(Connection c) throws SQLException {
        Set<String> s = list(c, "SELECT table_name || '.' || column_name FROM user_tab_columns WHERE data_type = 'JSON'");
        s.removeIf(x -> IGNORED_TABLES.contains(x.split("\\.")[0]));
        return s;
    }

    static Set<String> jsonChecks(Connection prod) throws SQLException {
        Set<String> out = new TreeSet<>();
        String sql = "SELECT c.table_name, cc.column_name, c.search_condition_vc FROM user_constraints c "
                + "JOIN user_cons_columns cc ON cc.constraint_name = c.constraint_name "
                + "WHERE c.constraint_type = 'C'";
        try (Statement st = prod.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                String cond = norm(rs.getString(3));
                if (cond.endsWith("ISJSON")) out.add(rs.getString(1) + "." + rs.getString(2));
            }
        }
        return out;
    }

    static Set<String> columns(Connection c, Set<String> jsonCols, boolean isDev) throws SQLException {
        Set<String> out = new TreeSet<>();
        Set<String> identity = list(c, "SELECT table_name || '.' || column_name FROM user_tab_identity_cols");
        String sql = "SELECT table_name, column_name, data_type, char_length, char_used, data_precision, data_scale, nullable "
                + "FROM user_tab_columns WHERE table_name NOT LIKE 'BIN$%'";
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                String tbl = rs.getString(1);
                if (IGNORED_TABLES.contains(tbl)) continue;
                String key = tbl + "." + rs.getString(2);
                String type = rs.getString(3);
                if (jsonCols.contains(key)) type = "JSON|CLOB-IS-JSON"; // beklenen tek fark normalize edilir
                String len = switch (type) {
                    case "VARCHAR2", "CHAR", "NVARCHAR2" -> "(" + rs.getInt(4) + " " + rs.getString(5) + ")";
                    case "NUMBER" -> "(" + rs.getString(6) + "," + rs.getString(7) + ")";
                    default -> "";
                };
                out.add(key + " " + type + len + " null=" + rs.getString(8) + (identity.contains(key) ? " IDENTITY" : ""));
            }
        }
        return out;
    }

    static Set<String> indexes(Connection c) throws SQLException {
        Map<String, List<String>> cols = new TreeMap<>();
        Map<String, String> meta = new HashMap<>();
        String sql = "SELECT i.index_name, i.table_name, i.uniqueness, ic.column_position, ic.column_name, ie.column_expression "
                + "FROM user_indexes i JOIN user_ind_columns ic ON ic.index_name = i.index_name "
                + "LEFT JOIN user_ind_expressions ie ON ie.index_name = ic.index_name AND ie.column_position = ic.column_position "
                + "WHERE i.index_type NOT IN ('LOB') ORDER BY i.index_name, ic.column_position";
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                String idx = rs.getString(1), tbl = rs.getString(2);
                if (IGNORED_TABLES.contains(tbl)) continue;
                String expr = rs.getString(6);
                cols.computeIfAbsent(idx, k -> new ArrayList<>()).add(expr != null ? norm(expr) : rs.getString(5));
                meta.put(idx, tbl + " " + rs.getString(3));
            }
        }
        Set<String> out = new TreeSet<>();
        cols.forEach((idx, cl) -> {
            String name = idx.startsWith("SYS_") ? "<sistem-adi>" : idx;
            out.add(meta.get(idx) + " (" + String.join(",", cl) + ") " + name);
        });
        return out;
    }

    static Set<String> constraints(Connection c, Set<String> jsonCols, boolean isDev) throws SQLException {
        Map<String, String[]> base = new LinkedHashMap<>();
        Map<String, List<String>> cols = new HashMap<>();
        String sql = "SELECT c.constraint_name, c.table_name, c.constraint_type, c.search_condition_vc, "
                + "r.table_name AS ref_table, c.delete_rule, cc.column_name, cc.position "
                + "FROM user_constraints c LEFT JOIN user_constraints r ON r.constraint_name = c.r_constraint_name "
                + "LEFT JOIN user_cons_columns cc ON cc.constraint_name = c.constraint_name "
                + "WHERE c.constraint_type IN ('P','U','R','C') AND c.table_name NOT LIKE 'BIN$%' "
                + "ORDER BY c.constraint_name, cc.position";
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                String name = rs.getString(1), tbl = rs.getString(2);
                if (IGNORED_TABLES.contains(tbl)) continue;
                base.putIfAbsent(name, new String[]{tbl, rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6)});
                if (rs.getString(7) != null) cols.computeIfAbsent(name, k -> new ArrayList<>()).add(rs.getString(7));
            }
        }
        Set<String> out = new TreeSet<>();
        for (var e : base.entrySet()) {
            String[] m = e.getValue();
            List<String> cl = cols.getOrDefault(e.getKey(), List.of());
            String cond = norm(m[2]);
            if ("C".equals(m[1])) {
                if (cond.matches("^\"?[A-Z0-9_]+\"?ISNOTNULL$")) continue; // NOT NULL -> sütun karşılaştırmasında
                if (!isDev && cond.endsWith("ISJSON") && cl.size() == 1 && jsonCols.contains(m[0] + "." + cl.get(0))) continue;
            }
            String name = e.getKey().startsWith("SYS_") ? "<sistem-adi>" : e.getKey();
            out.add(m[0] + " " + m[1] + " (" + String.join(",", cl) + ")"
                    + (m[3] != null ? " -> " + m[3] + " ondelete=" + m[4] : "")
                    + ("C".equals(m[1]) ? " [" + cond + "]" : "") + " " + name);
        }
        return out;
    }

    static Set<String> triggers(Connection c) throws SQLException {
        return list(c, "SELECT trigger_name || ' ON ' || table_name || ' ' || trigger_type || ' ' || triggering_event || ' ' || status FROM user_triggers");
    }

    static String norm(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "").replace("\"", "").toUpperCase(Locale.ROOT);
    }
}

