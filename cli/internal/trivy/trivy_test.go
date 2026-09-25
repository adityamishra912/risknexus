package trivy

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseScanFileHandlesNestedResults(t *testing.T) {
	path := filepath.Join(t.TempDir(), "trivy.json")
	scan := `{
		"SchemaVersion": 2,
		"Trivy": {"Version": "0.74.0"},
		"Results": [{
			"Target": "ubuntu:22.04",
			"Class": "os-pkgs",
			"Type": "ubuntu",
			"Packages": [{"ID": "openssl@3.0.0", "Name": "openssl", "Version": "3.0.0"}],
			"Vulnerabilities": [
				{
					"VulnerabilityID": "CVE-2024-0001",
					"PkgID": "openssl@3.0.0",
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
					"PkgIdentifier": {"PURL": "pkg:deb/ubuntu/openssl@3.0.0?os=linux", "UID": "openssl@3.0.0"},
					"Target": "ubuntu:22.04",
					"Class": "os-pkgs"
				}
			]
		}]
	}`
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
				"PkgIdentifier": {"PURL": "pkg:deb/ubuntu/openssl@3.0.0", "UID": "openssl@3.0.0"},
				"InstalledVersion": "3.0.0",
				"Severity": "HIGH",
				"CVSS": {"nvd": {"V3Score": 7.8}},
				"References": null,
				"CWEIDs": null,
				"VendorIDs": null
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
	if records[0].CVSSScore == nil || *records[0].CVSSScore != 7.8 {
		t.Fatalf("expected CVSS score 7.8, got %v", records[0].CVSSScore)
	}
	if records[0].PkgIdentifier != "pkg:deb/ubuntu/openssl@3.0.0" {
		t.Fatalf("unexpected package identifier: %s", records[0].PkgIdentifier)
	}
	if string(records[0].RawJSON) == "" {
		t.Fatal("expected raw vulnerability JSON to be preserved")
	}
}

func TestParseCopiedTrivyReport(t *testing.T) {
	path := filepath.Join("..", "..", "..", "trivy-vulnerabilities.json")
	if _, err := os.Stat(path); err != nil {
		t.Skipf("copied source-of-truth report unavailable: %v", err)
	}

	records, stats, err := ParseScanFile(path)
	if err != nil {
		t.Fatalf("ParseScanFile(real report) returned error: %v", err)
	}
	if stats.ResultsFound == 0 {
		t.Fatal("expected at least one Result in the real report")
	}
	if stats.VulnerabilitiesFound == 0 {
		t.Fatal("expected at least one vulnerability in the real report")
	}
	if len(records) == 0 {
		t.Fatalf("expected valid vulnerability records, got stats %+v", stats)
	}
	if records[0].RawJSON == nil || len(records[0].RawJSON) == 0 {
		t.Fatal("expected original vulnerability JSON to be preserved")
	}
}

