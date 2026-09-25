package mysql

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/cybernexus/cli/internal/config"
	"github.com/cybernexus/cli/internal/trivy"
)

const trivyVulnerabilitiesSchema = `
CREATE TABLE IF NOT EXISTS trivy_vulnerabilities (
    id BIGINT NOT NULL AUTO_INCREMENT,
	target VARCHAR(255) NULL,
	type VARCHAR(64) NULL,
	vulnerability_id VARCHAR(128) NULL,
    package_name VARCHAR(255) NULL,
    installed_version VARCHAR(255) NULL,
    fixed_version VARCHAR(255) NULL,
	status VARCHAR(32) NULL,
	severity VARCHAR(32) NULL,
    title TEXT NULL,
    description TEXT NULL,
	primary_url VARCHAR(512) NULL,
    published_date DATETIME NULL,
    last_modified_date DATETIME NULL,
	package_identifier VARCHAR(512) NULL,
    raw_json JSON NULL,
    collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
	UNIQUE KEY uq_trivy_vulnerability (target(191), vulnerability_id, package_name(191), installed_version(191)),
    KEY idx_trivy_target (target),
    KEY idx_trivy_severity (severity),
    KEY idx_trivy_package (package_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`

func EnsureTrivyTable(ctx context.Context, value config.MySQLConfig) error {
	db, err := openDatabase(value)
	if err != nil {
		return fmt.Errorf("open database for Trivy table setup: %w", err)
	}
	defer db.Close()
	if _, err := db.ExecContext(ctx, trivyVulnerabilitiesSchema); err != nil {
		return fmt.Errorf("create trivy_vulnerabilities table: %w", err)
	}
	var uniqueIndexExists int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*)
		FROM information_schema.statistics
		WHERE table_schema = DATABASE()
		  AND table_name = 'trivy_vulnerabilities'
		  AND index_name = 'uq_trivy_vulnerability'`).Scan(&uniqueIndexExists); err != nil {
		return fmt.Errorf("inspect trivy_vulnerabilities indexes: %w", err)
	}
	if uniqueIndexExists > 0 {
		if _, err := db.ExecContext(ctx, `ALTER TABLE trivy_vulnerabilities
			DROP INDEX uq_trivy_vulnerability,
			ADD UNIQUE KEY uq_trivy_vulnerability (target(191), vulnerability_id, package_name(191), installed_version(191))`); err != nil {
			return fmt.Errorf("migrate trivy_vulnerabilities uniqueness index: %w", err)
		}
	}
	return nil
}

func ImportTrivyVulnerabilities(ctx context.Context, value config.MySQLConfig, records []trivy.VulnerabilityRecord) (int, error) {
	if len(records) == 0 {
		return 0, nil
	}
	db, err := openDatabase(value)
	if err != nil {
		return 0, fmt.Errorf("open database for Trivy import: %w", err)
	}
	defer db.Close()
	if err := EnsureTrivyTable(ctx, value); err != nil {
		return 0, err
	}
	transaction, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return 0, fmt.Errorf("begin Trivy transaction: %w", err)
	}
	defer func() {
		if err != nil {
			_ = transaction.Rollback()
		}
	}()
	stmt := `INSERT INTO trivy_vulnerabilities (
		target,
		type,
		vulnerability_id,
		package_name,
		installed_version,
		fixed_version,
		status,
		severity,
		title,
		description,
		primary_url,
		published_date,
		last_modified_date,
		package_identifier,
		raw_json,
		collected_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
	ON DUPLICATE KEY UPDATE
		target = VALUES(target),
		type = VALUES(type),
		fixed_version = VALUES(fixed_version),
		status = VALUES(status),
		severity = VALUES(severity),
		title = VALUES(title),
		description = VALUES(description),
		primary_url = VALUES(primary_url),
		published_date = VALUES(published_date),
		last_modified_date = VALUES(last_modified_date),
		package_identifier = VALUES(package_identifier),
		raw_json = VALUES(raw_json),
		collected_at = NOW()`
	for _, record := range records {
		rawJSON := record.RawJSON
		if len(rawJSON) == 0 {
			rawJSON, err = json.Marshal(map[string]any{
			"vulnerability_id": record.VulnerabilityID,
			"pkg_name": record.PkgName,
			"installed_version": record.InstalledVersion,
			"fixed_version": record.FixedVersion,
			"status": record.Status,
			"severity": record.Severity,
			"title": record.Title,
			"description": record.Description,
			"primary_url": record.PrimaryURL,
			"references": record.References,
			"published_date": record.PublishedDate,
			"last_modified_date": record.LastModifiedDate,
			"pkg_identifier": record.PkgIdentifier,
			"target": record.Target,
			"type": record.Type,
			})
		}
		if err != nil {
			return 0, fmt.Errorf("marshal Trivy raw JSON: %w", err)
		}
		published := parseNullableDate(record.PublishedDate)
		modified := parseNullableDate(record.LastModifiedDate)
		_, insertErr := transaction.ExecContext(ctx, stmt,
			record.Target,
			record.Type,
			record.VulnerabilityID,
			record.PkgName,
			record.InstalledVersion,
			record.FixedVersion,
			record.Status,
			record.Severity,
			record.Title,
			record.Description,
			record.PrimaryURL,
			published,
			modified,
			record.PkgIdentifier,
			rawJSON,
		)
		if insertErr != nil {
			return 0, fmt.Errorf("insert Trivy vulnerability %s: %w", record.VulnerabilityID, insertErr)
		}
	}
	if err := transaction.Commit(); err != nil {
		return 0, fmt.Errorf("commit Trivy import: %w", err)
	}
	return len(records), nil
}

type TrivyImportVerification struct {
	Total int
	Sample []struct {
		VulnerabilityID string
		Target          string
		CVEID           string
		Severity        string
		CVSSScore       interface{}
	}
}

func VerifyTrivyImport(ctx context.Context, value config.MySQLConfig) (TrivyImportVerification, error) {
	db, err := openDatabase(value)
	if err != nil {
		return TrivyImportVerification{}, fmt.Errorf("open database for Trivy verification: %w", err)
	}
	defer db.Close()
	var verification TrivyImportVerification
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM trivy_vulnerabilities").Scan(&verification.Total); err != nil {
		return TrivyImportVerification{}, fmt.Errorf("count imported Trivy vulnerabilities: %w", err)
	}
	rows, err := db.QueryContext(ctx, `SELECT vulnerability_id AS vulnerability_id,
		target AS asset_id,
		vulnerability_id AS cve_id,
		severity,
		NULL AS cvss_score
		FROM trivy_vulnerabilities ORDER BY id LIMIT 10`)
	if err != nil {
		return TrivyImportVerification{}, fmt.Errorf("sample imported Trivy vulnerabilities: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var sample struct {
			VulnerabilityID string
			Target          string
			CVEID           string
			Severity        string
			CVSSScore       interface{}
		}
		if err := rows.Scan(&sample.VulnerabilityID, &sample.Target, &sample.CVEID, &sample.Severity, &sample.CVSSScore); err != nil {
			return TrivyImportVerification{}, fmt.Errorf("read sampled Trivy vulnerability: %w", err)
		}
		verification.Sample = append(verification.Sample, sample)
	}
	if err := rows.Err(); err != nil {
		return TrivyImportVerification{}, fmt.Errorf("iterate sampled Trivy vulnerabilities: %w", err)
	}
	return verification, nil
}

func parseNullableDate(value string) interface{} {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, value)
	if err == nil {
		return t
	}
	if t2, err2 := time.Parse("2006-01-02T15:04:05.999999999Z07:00", value); err2 == nil {
		return t2
	}
	return value
}
