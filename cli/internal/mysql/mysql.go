package mysql

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/cybernexus/cli/internal/config"
)

var validIdentifier = regexp.MustCompile(`^[A-Za-z0-9_]+$`)

type CheckResult struct {
	DatabaseExists bool
	LooksLikeGLPI  bool
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
