package trivy

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseScanFileHandlesNestedResults(t *testing.T) {
	path := filepath.Join(t.TempDir(), "trivy.json")
	scan := `[
		{
			"Target": "ubuntu:22.04",
			"Class": "os-pkgs",
			"Vulnerabilities": [
				{
					"VulnerabilityID": "CVE-2024-0001",
					"PkgName": "openssl",
					"InstalledVersion": "3.0.0",
					"FixedVersion": "3.0.1",
					"Status": "fixed",
					"Severity": "HIGH",
					"Title": "openssl issue",
					"Description": "desc",
					"PrimaryURL": "https://example.com",
					"References": ["https://example.com/ref"],
					"PublishedDate": "2024-01-01T00:00:00Z",
					"LastModifiedDate": "2024-02-01T00:00:00Z",
					"PkgIdentifier": "pkg:deb/ubuntu/openssl@3.0.0?os=linux",
					"Target": "ubuntu:22.04",
					"Class": "os-pkgs"
				}
			]
		}
	]`
	if err := os.WriteFile(path, []byte(scan), 0o600); err != nil {
		t.Fatal(err)
	}

	items, err := ParseScanFile(path)
	if err != nil {
		t.Fatalf("ParseScanFile returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 vulnerability, got %d", len(items))
	}
	if items[0].VulnerabilityID != "CVE-2024-0001" {
		t.Fatalf("unexpected vulnerability id: %s", items[0].VulnerabilityID)
	}
	if items[0].Target != "ubuntu:22.04" {
		t.Fatalf("unexpected target: %s", items[0].Target)
	}
}

func TestParseScanFileRejectsMalformedJSON(t *testing.T) {
	path := filepath.Join(t.TempDir(), "bad.json")
	if err := os.WriteFile(path, []byte("[{"), 0o600); err != nil {
		t.Fatal(err)
	}

	if _, err := ParseScanFile(path); err == nil {
		t.Fatal("expected malformed JSON error")
	}
}

func TestParseTrivyResultsHandlesObjectEnvelope(t *testing.T) {
	data := []byte(`{
		"SchemaVersion": 2,
		"ArtifactName": "/",
		"ArtifactType": "filesystem",
		"Results": [{
			"Target": "ubuntu:22.04",
			"Class": "os-pkgs",
			"Type": "ubuntu",
			"Vulnerabilities": [{
				"VulnerabilityID": "CVE-2024-0001",
				"PkgName": "openssl",
				"InstalledVersion": "3.0.0",
				"Severity": "HIGH"
			}]
		}]
	}`)

	records, stats, err := ParseTrivyResultsWithStats(data)
	if err != nil {
		t.Fatalf("ParseTrivyResultsWithStats returned error: %v", err)
	}
	if stats.ResultsFound != 1 || stats.VulnerabilitiesFound != 1 || stats.Skipped != 0 {
		t.Fatalf("unexpected parse stats: %+v", stats)
	}
	if len(records) != 1 || records[0].VulnerabilityID != "CVE-2024-0001" {
		t.Fatalf("unexpected records: %+v", records)
	}
	if string(records[0].RawJSON) == "" {
		t.Fatal("expected raw vulnerability JSON to be preserved")
	}
}

