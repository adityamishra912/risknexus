package mysql

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/risknexus/cli/internal/config"
)

var validIdentifier = regexp.MustCompile(`^[A-Za-z0-9_]+$`)

type CheckResult struct {
	DatabaseExists bool
	LooksLikeGLPI  bool
}

type InventoryCounts struct {
	Computers        int
	Softwares        int
	SoftwareVersions int
}

type InventoryConfigurationLogger func(format string, args ...any)

type AdminCredentials struct {
	Username string
	Password string
}

type AdminCredentialsRequiredError struct {
	Reason error
}

func (e *AdminCredentialsRequiredError) Error() string {
	return fmt.Sprintf("MySQL administrative credentials are required for first-time Docker-network authorization: %v", e.Reason)
}

func (e *AdminCredentialsRequiredError) Unwrap() error { return e.Reason }

func ConfigureInventory(ctx context.Context, value config.MySQLConfig, logf InventoryConfigurationLogger) error {
	db, err := openDatabase(value)
	if err != nil {
		return fmt.Errorf("open GLPI database for inventory configuration: %w", err)
	}
	defer db.Close()
	return ConfigureInventoryDB(ctx, db, logf)
}

func ConfigureInventoryDB(ctx context.Context, db *sql.DB, logf InventoryConfigurationLogger) error {
	var enabledValue string
	err := db.QueryRowContext(ctx, `
		SELECT value
		FROM glpi_configs
		WHERE context = ?
		  AND name = ?
		LIMIT 1`, "inventory", "enabled_inventory").Scan(&enabledValue)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("GLPI inventory configuration error: glpi_configs row for context 'inventory' and name 'enabled_inventory' was not found")
	}
	if err != nil {
		return fmt.Errorf("query GLPI inventory configuration: %w", err)
	}

	if logf != nil {
		logf("→ enabled_inventory = %s", enabledValue)
	}
	if enabledValue == "1" {
		if logf != nil {
			logf("GLPI inventory is already enabled.")
		}
		return nil
	}

	if logf != nil {
		logf("→ Enabling GLPI inventory")
	}
	if _, err := db.ExecContext(ctx, `
		UPDATE glpi_configs
		SET value = ?
		WHERE context = ?
		  AND name = ?`, "1", "inventory", "enabled_inventory"); err != nil {
		return fmt.Errorf("enable GLPI inventory: %w", err)
	}

	var verifiedValue string
	if err := db.QueryRowContext(ctx, `
		SELECT value
		FROM glpi_configs
		WHERE context = ?
		  AND name = ?
		LIMIT 1`, "inventory", "enabled_inventory").Scan(&verifiedValue); err != nil {
		return fmt.Errorf("verify GLPI inventory configuration: %w", err)
	}
	if logf != nil {
		logf("→ enabled_inventory = %s", verifiedValue)
	}
	if verifiedValue != "1" {
		return fmt.Errorf("GLPI inventory configuration verification failed: enabled_inventory is %q, expected %q", verifiedValue, "1")
	}
	if logf != nil {
		logf("✓ GLPI inventory enabled successfully")
	}
	return nil
}

func Check(ctx context.Context, value config.MySQLConfig) (CheckResult, error) {
	if !validIdentifier.MatchString(value.Database) { return CheckResult{}, fmt.Errorf("invalid database name %q", value.Database) }
	baseDSN := fmt.Sprintf("%s:%s@tcp(%s:%d)/?timeout=5s&readTimeout=5s&writeTimeout=5s", value.Username, value.Password, value.Host, value.Port)
	db, err := sql.Open("mysql", baseDSN)
	if err != nil { return CheckResult{}, fmt.Errorf("open MySQL connection: %w", err) }
	defer db.Close()
	pingCtx, cancel := context.WithTimeout(ctx, 7*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil { return CheckResult{}, fmt.Errorf("connect to MySQL %s:%d as %q: %w", value.Host, value.Port, value.Username, err) }
	var exists int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = ?", value.Database).Scan(&exists); err != nil { return CheckResult{}, fmt.Errorf("check database %q: %w", value.Database, err) }
	if exists == 0 { return CheckResult{DatabaseExists: false}, nil }
	var tableCount int
	err = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('glpi_computers', 'glpi_softwares', 'glpi_softwareversions')", value.Database).Scan(&tableCount)
	if err != nil { return CheckResult{}, fmt.Errorf("inspect GLPI tables in %q: %w", value.Database, err) }
	return CheckResult{DatabaseExists: true, LooksLikeGLPI: tableCount > 0}, nil
}

func openDatabase(value config.MySQLConfig) (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?timeout=5s&readTimeout=5s&writeTimeout=5s", value.Username, value.Password, value.Host, value.Port, value.Database)
	return sql.Open("mysql", dsn)
}

func CreateDatabase(ctx context.Context, value config.MySQLConfig) error {
	if !validIdentifier.MatchString(value.Database) { return fmt.Errorf("invalid database name %q", value.Database) }
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?timeout=5s", value.Username, value.Password, value.Host, value.Port)
	db, err := sql.Open("mysql", dsn)
	if err != nil { return fmt.Errorf("open MySQL connection: %w", err) }
	defer db.Close()
	_, err = db.ExecContext(ctx, "CREATE DATABASE IF NOT EXISTS `"+value.Database+"` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
	if err != nil { return fmt.Errorf("create database %q: %w", value.Database, err) }
	return nil
}

func Inventory(ctx context.Context, value config.MySQLConfig) (InventoryCounts, error) {
	db, err := openDatabase(value)
	if err != nil { return InventoryCounts{}, fmt.Errorf("open GLPI database: %w", err) }
	defer db.Close()
	var result InventoryCounts
	for _, query := range []struct { target *int; name string }{
		{&result.Computers, "glpi_computers"},
		{&result.Softwares, "glpi_softwares"},
		{&result.SoftwareVersions, "glpi_softwareversions"},
	} {
		if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM `"+query.name+"`").Scan(query.target); err != nil {
			return InventoryCounts{}, fmt.Errorf("count %s: %w", query.name, err)
		}
	}
	return result, nil
}

func EnsureDockerNetworkAccess(ctx context.Context, value config.MySQLConfig, subnet string) error {
	hostPattern, err := mysqlHostPattern(subnet)
	if err != nil {
		return err
	}
	db, err := openServerDatabase(value)
	if err != nil {
		return fmt.Errorf("open MySQL connection for Docker network authorization: %w", err)
	}
	defer db.Close()

	return ensureDockerNetworkAccessDB(ctx, db, value, hostPattern)
}

func ensureDockerNetworkAccessDB(ctx context.Context, db *sql.DB, value config.MySQLConfig, hostPattern string) error {
	var accountCount int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM mysql.user WHERE User = ? AND Host = ?", value.Username, hostPattern).Scan(&accountCount); err != nil {
		return &AdminCredentialsRequiredError{Reason: fmt.Errorf("inspect MySQL Docker network account %q@%q: %w", value.Username, hostPattern, err)}
	}
	if accountCount == 0 {
		return &AdminCredentialsRequiredError{Reason: fmt.Errorf("account %q@%q does not exist", value.Username, hostPattern)}
	}
	if err := grantDockerNetworkSelect(ctx, db, value.Database, value.Username, hostPattern); err != nil {
		return &AdminCredentialsRequiredError{Reason: err}
	}
	return nil
}

func ProvisionDockerNetworkAccess(ctx context.Context, value config.MySQLConfig, subnet string, admin AdminCredentials) error {
	hostPattern, err := mysqlHostPattern(subnet)
	if err != nil {
		return err
	}
	db, err := openAdminDatabase(value, admin)
	if err != nil {
		return fmt.Errorf("open MySQL administrative connection: %w", err)
	}
	defer db.Close()
	return provisionDockerNetworkAccessDB(ctx, db, value, hostPattern)
}

func provisionDockerNetworkAccessDB(ctx context.Context, db *sql.DB, value config.MySQLConfig, hostPattern string) error {

	var accountCount int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM mysql.user WHERE User = ? AND Host = ?", value.Username, hostPattern).Scan(&accountCount); err != nil {
		return fmt.Errorf("inspect MySQL Docker network account %q@%q: %w", value.Username, hostPattern, err)
	}
	account := mysqlAccount(value.Username, hostPattern)
	if accountCount == 0 {
		passwordLiteral := mysqlStringLiteral(value.Password)
		if _, err := db.ExecContext(ctx, "CREATE USER IF NOT EXISTS "+account+" IDENTIFIED BY "+passwordLiteral); err != nil {
			return fmt.Errorf("create MySQL Docker network account %q@%q: %w", value.Username, hostPattern, err)
		}
	}
	return grantDockerNetworkSelect(ctx, db, value.Database, value.Username, hostPattern)
}

func grantDockerNetworkSelect(ctx context.Context, db *sql.DB, databaseName, username, hostPattern string) error {
	account := mysqlAccount(username, hostPattern)
	database := mysqlIdentifier(databaseName)
	if _, err := db.ExecContext(ctx, "GRANT SELECT ON "+database+".* TO "+account); err != nil {
		return fmt.Errorf("grant MySQL read access to Docker network account %q@%q: %w", username, hostPattern, err)
	}
	return nil
}

func openServerDatabase(value config.MySQLConfig) (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?timeout=5s&readTimeout=5s&writeTimeout=5s", value.Username, value.Password, value.Host, value.Port)
	return sql.Open("mysql", dsn)
}

func openAdminDatabase(value config.MySQLConfig, admin AdminCredentials) (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?timeout=5s&readTimeout=5s&writeTimeout=5s", admin.Username, admin.Password, value.Host, value.Port)
	return sql.Open("mysql", dsn)
}

func mysqlHostPattern(subnet string) (string, error) {
	ip, network, err := net.ParseCIDR(subnet)
	if err != nil || ip.To4() == nil {
		return "", fmt.Errorf("unsupported Docker network subnet %q: expected an IPv4 CIDR", subnet)
	}
	one, two, three, _ := ip.To4()[0], ip.To4()[1], ip.To4()[2], ip.To4()[3]
	maskSize, _ := network.Mask.Size()
	switch {
	case maskSize == 8:
		return fmt.Sprintf("%d.%", one), nil
	case maskSize == 16:
		return fmt.Sprintf("%d.%d.%", one, two), nil
	case maskSize == 24:
		return fmt.Sprintf("%d.%d.%d.%", one, two, three), nil
	default:
		return "", fmt.Errorf("Docker network subnet %q is not octet-aligned; cannot represent it safely as a MySQL host pattern", subnet)
	}
}

func mysqlAccount(username, host string) string {
	return "'" + strings.ReplaceAll(username, "'", "''") + "'@'" + strings.ReplaceAll(host, "'", "''") + "'"
}

func mysqlIdentifier(identifier string) string {
	return "`" + strings.ReplaceAll(identifier, "`", "``") + "`"
}

func mysqlStringLiteral(value string) string {
	value = strings.NewReplacer("\\", "\\\\", "'", "\\'", "\x00", "\\0", "\n", "\\n", "\r", "\\r", "\x1a", "\\Z").Replace(value)
	return "'" + value + "'"
}
