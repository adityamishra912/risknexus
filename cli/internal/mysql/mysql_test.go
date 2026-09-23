package mysql

import (
	"context"
	"regexp"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
)

const inventorySelect = `SELECT value
		FROM glpi_configs
		WHERE context = ?
		  AND name = ?
		LIMIT 1`

func TestConfigureInventoryAlreadyEnabled(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mock.ExpectQuery(regexp.QuoteMeta(inventorySelect)).
		WithArgs("inventory", "enabled_inventory").
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("1"))

	var messages []string
	err = ConfigureInventoryDB(context.Background(), db, func(format string, args ...any) {
		messages = append(messages, format)
	})
	if err != nil {
		t.Fatalf("ConfigureInventoryDB returned error: %v", err)
	}
	if len(messages) != 2 || messages[1] != "GLPI inventory is already enabled." {
		t.Fatalf("unexpected messages: %#v", messages)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestConfigureInventoryMissingRow(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mock.ExpectQuery(regexp.QuoteMeta(inventorySelect)).
		WithArgs("inventory", "enabled_inventory").
		WillReturnRows(sqlmock.NewRows([]string{"value"}))

	err = ConfigureInventoryDB(context.Background(), db, nil)
	if err == nil || err.Error() != "GLPI inventory configuration error: glpi_configs row for context 'inventory' and name 'enabled_inventory' was not found" {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestConfigureInventoryEnablesAndVerifies(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mock.ExpectQuery(regexp.QuoteMeta(inventorySelect)).
		WithArgs("inventory", "enabled_inventory").
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0"))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE glpi_configs
		SET value = ?
		WHERE context = ?
		  AND name = ?`)).
		WithArgs("1", "inventory", "enabled_inventory").
		WillReturnResult(sqlmock.NewResult(256, 1))
	mock.ExpectQuery(regexp.QuoteMeta(inventorySelect)).
		WithArgs("inventory", "enabled_inventory").
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("1"))

	if err := ConfigureInventoryDB(context.Background(), db, nil); err != nil {
		t.Fatalf("ConfigureInventoryDB returned error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
