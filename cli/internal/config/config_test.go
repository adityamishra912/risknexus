package config

import (
	"path/filepath"
	"testing"
)

func TestValidateRiskNexusHost(t *testing.T) {
	valid := []string{"192.168.201.129", "risknexus.example", "localhost"}
	for _, host := range valid {
		if err := ValidateRiskNexusHost(host); err != nil {
			t.Errorf("expected %q to be valid: %v", host, err)
		}
	}
	invalid := []string{"", "http://192.168.201.129", "192.168.201.129:3000", "server/path", "server name"}
	for _, host := range invalid {
		if err := ValidateRiskNexusHost(host); err == nil {
			t.Errorf("expected %q to be rejected", host)
		}
	}
}

func TestGenerateBrowserURLs(t *testing.T) {
	urls, err := GenerateBrowserURLs("192.168.201.129")
	if err != nil {
		t.Fatal(err)
	}
	if urls.GLPIURL != "http://192.168.201.129/glpi" || urls.GLPIInventoryURL != "http://192.168.201.129/glpi/front/inventory.php" || urls.NextPublicAPIURL != "http://192.168.201.129:8000/api/v1" {
		t.Fatalf("unexpected browser URLs: %#v", urls)
	}
}

func TestSaveLoadPreservesHostConfiguration(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	original := MySQLConfig{
		Host: "127.0.0.1", Port: 3306, Database: "glpi", Username: "glpi_user", Password: "secret",
		RiskNexusHost: "192.168.201.129", GLPIURL: "http://192.168.201.129/glpi",
		GLPIInventoryURL: "http://192.168.201.129/glpi/front/inventory.php", NextPublicAPIURL: "http://192.168.201.129:8000/api/v1",
		MySQLHostContainer: "host.docker.internal",
	}
	if err := Save(path, original); err != nil {
		t.Fatal(err)
	}
	loaded, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.RiskNexusHost != original.RiskNexusHost || loaded.NextPublicAPIURL != original.NextPublicAPIURL || loaded.MySQLHostContainer != original.MySQLHostContainer {
		t.Fatalf("host configuration was not preserved: %#v", loaded)
	}
}
