package mysql

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/risknexus/cli/internal/config"
)

func dockerNetworkTestValue() config.MySQLConfig {
	return config.MySQLConfig{Host: "127.0.0.1", Port: 3306, Database: "glpi", Username: "glpi_user", Password: "secret"}
}

func TestEnsureDockerNetworkAccessExistingAccountUsesNormalCredentials(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil { t.Fatal(err) }
	defer db.Close()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM mysql.user WHERE User = ? AND Host = ?")).
		WithArgs("glpi_user", "172.19.%").
		WillReturnRows(sqlmock.NewRows([]string{"COUNT(*)"}).AddRow(1))
	mock.ExpectExec(regexp.QuoteMeta("GRANT SELECT ON `glpi`.* TO 'glpi_user'@'172.19.%'")).
		WillReturnResult(sqlmock.NewResult(0, 0))

	if err := ensureDockerNetworkAccessDB(context.Background(), db, dockerNetworkTestValue(), "172.19.%"); err != nil {
		t.Fatalf("ensureDockerNetworkAccessDB returned error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil { t.Fatal(err) }
}

func TestEnsureDockerNetworkAccessMissingAccountRequiresAdmin(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil { t.Fatal(err) }
	defer db.Close()
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM mysql.user WHERE User = ? AND Host = ?")).
		WithArgs("glpi_user", "172.19.%").
		WillReturnRows(sqlmock.NewRows([]string{"COUNT(*)"}).AddRow(0))

	err = ensureDockerNetworkAccessDB(context.Background(), db, dockerNetworkTestValue(), "172.19.%")
	var adminRequired *AdminCredentialsRequiredError
	if !errors.As(err, &adminRequired) { t.Fatalf("expected admin credentials error, got %v", err) }
	if err := mock.ExpectationsWereMet(); err != nil { t.Fatal(err) }
}

func TestProvisionDockerNetworkAccessCreatesRestrictedAccountWithoutLocalAccountChange(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil { t.Fatal(err) }
	defer db.Close()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM mysql.user WHERE User = ? AND Host = ?")).
		WithArgs("glpi_user", "172.19.%").
		WillReturnRows(sqlmock.NewRows([]string{"COUNT(*)"}).AddRow(0))
	mock.ExpectExec(regexp.QuoteMeta("CREATE USER IF NOT EXISTS 'glpi_user'@'172.19.%' IDENTIFIED BY 'secret'")).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectExec(regexp.QuoteMeta("GRANT SELECT ON `glpi`.* TO 'glpi_user'@'172.19.%'")).
		WillReturnResult(sqlmock.NewResult(0, 0))

	if err := provisionDockerNetworkAccessDB(context.Background(), db, dockerNetworkTestValue(), "172.19.%"); err != nil {
		t.Fatalf("provisionDockerNetworkAccessDB returned error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil { t.Fatal(err) }
}

func TestProvisionDockerNetworkAccessReportsInsufficientAdminPrivileges(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil { t.Fatal(err) }
	defer db.Close()
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COUNT(*) FROM mysql.user WHERE User = ? AND Host = ?")).
		WithArgs("glpi_user", "172.19.%").
		WillReturnError(errors.New("Access denied; missing mysql.user privilege"))

	err = provisionDockerNetworkAccessDB(context.Background(), db, dockerNetworkTestValue(), "172.19.%")
	if err == nil || !strings.Contains(err.Error(), "inspect MySQL Docker network account") {
		t.Fatalf("expected actionable admin error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil { t.Fatal(err) }
}

