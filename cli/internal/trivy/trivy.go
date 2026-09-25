package trivy

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
)

const TempOutputPath = "/tmp/trivy-vulnerabilities.json"

type TrivyReport struct {
	SchemaVersion int             `json:"SchemaVersion"`
	Trivy         TrivyInfo      `json:"Trivy"`
	ReportID      string          `json:"ReportID"`
	CreatedAt     string          `json:"CreatedAt"`
	ArtifactName  string          `json:"ArtifactName"`
	ArtifactType  string          `json:"ArtifactType"`
	Metadata      json.RawMessage `json:"Metadata"`
	Results       []TrivyResult   `json:"Results"`
}

type TrivyInfo struct {
	Version string `json:"Version"`
}

type TrivyResult struct {
	Class           string              `json:"Class"`
	Target          string              `json:"Target"`
	Type            string              `json:"Type"`
	Packages        []TrivyPackage      `json:"Packages"`
	Vulnerabilities []json.RawMessage   `json:"Vulnerabilities"`
}

type TrivyPackage struct {
	ID         string `json:"ID"`
	Name       string `json:"Name"`
	Identifier string `json:"Identifier"`
	Version    string `json:"Version"`
	Release    string `json:"Release"`
	Arch       string `json:"Arch"`
}

type TrivyVulnerability struct {
	VulnerabilityID  string          `json:"VulnerabilityID"`
	PkgID            string          `json:"PkgID"`
	PkgName          string          `json:"PkgName"`
	PkgIdentifier    string          `json:"PkgIdentifier"`
	InstalledVersion string          `json:"InstalledVersion"`
	FixedVersion     string          `json:"FixedVersion"`
	Severity         string          `json:"Severity"`
	SeveritySource   string          `json:"SeveritySource"`
	CVSS             json.RawMessage `json:"CVSS"`
	CWEIDs           []string        `json:"CWEIDs"`
	Description      string          `json:"Description"`
	Title            string          `json:"Title"`
	References       []string        `json:"References"`
	PublishedDate    string          `json:"PublishedDate"`
	LastModifiedDate string          `json:"LastModifiedDate"`
	PrimaryURL       string          `json:"PrimaryURL"`
	DataSource       json.RawMessage `json:"DataSource"`
	VendorIDs        []string        `json:"VendorIDs"`
	VendorSeverity   string          `json:"VendorSeverity"`
	Status           string          `json:"Status"`
	Fingerprint      string          `json:"Fingerprint"`
	RawJSON          json.RawMessage `json:"-"`
}

type ParseStats struct {
	ResultsFound         int
	VulnerabilitiesFound int
	Skipped              int
	MissingVulnerabilityID int
	InvalidRecord          int
	Duplicate              int
	TrivyVersion           string
}

type VulnerabilityRecord struct {
	VulnerabilityID   string   `json:"VulnerabilityID"`
	PkgName           string   `json:"PkgName"`
	InstalledVersion  string   `json:"InstalledVersion"`
	FixedVersion      string   `json:"FixedVersion"`
	Status            string   `json:"Status"`
	Severity          string   `json:"Severity"`
	Title             string   `json:"Title"`
	Description       string   `json:"Description"`
	PrimaryURL        string   `json:"PrimaryURL"`
	References        []string `json:"References"`
	PublishedDate     string   `json:"PublishedDate"`
	LastModifiedDate  string   `json:"LastModifiedDate"`
	PkgIdentifier     string   `json:"PkgIdentifier"`
	PkgID             string   `json:"PkgID"`
	SeveritySource    string   `json:"SeveritySource"`
	CVSSScore         *float64 `json:"CVSSScore"`
	Target            string   `json:"Target"`
	Class             string   `json:"Class"`
	Type              string   `json:"Type"`
	RawJSON           json.RawMessage `json:"-"`
}

func LoadTrivyJSON(path string) ([]byte, error) {
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("[Trivy] Existing Trivy JSON file was not found: %s", path)
		}
		return nil, fmt.Errorf("[Trivy] Unable to access existing Trivy JSON file %s: %w", path, err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("[Trivy] Failed to read existing Trivy JSON file %s: %w", path, err)
	}
	return data, nil
}
func ParseScanFile(path string) ([]VulnerabilityRecord, error) {
	data, err := LoadTrivyJSON(path)
	if err != nil {
		return nil, err
	}
	return ParseTrivyResults(data)
}

func ParseTrivyResults(data []byte) ([]VulnerabilityRecord, error) {
	records, _, err := ParseTrivyResultsWithStats(data)
	return records, err
}

func ParseTrivyResultsWithStats(data []byte) ([]VulnerabilityRecord, ParseStats, error) {
	var report TrivyReport
	if err := json.Unmarshal(data, &report); err != nil {
		return nil, ParseStats{}, fmt.Errorf("[Trivy] Failed to parse existing scan result: %w", err)
	}
	stats := ParseStats{ResultsFound: len(report.Results), TrivyVersion: report.Trivy.Version}
	var records []VulnerabilityRecord
	seen := make(map[string]struct{})
	for _, result := range report.Results {
		packages := make(map[string]TrivyPackage, len(result.Packages))
		packagesByNameVersion := make(map[string]TrivyPackage, len(result.Packages))
		for _, pkg := range result.Packages {
			if pkg.ID != "" { packages[pkg.ID] = pkg }
			if pkg.Name != "" { packagesByNameVersion[pkg.Name+"\x00"+pkg.Version] = pkg }
		}
		for _, rawVulnerability := range result.Vulnerabilities {
			stats.VulnerabilitiesFound++
			var vuln TrivyVulnerability
			if err := json.Unmarshal(rawVulnerability, &vuln); err != nil {
				stats.InvalidRecord++
				stats.Skipped++
				continue
			}
			if strings.TrimSpace(vuln.VulnerabilityID) == "" {
				stats.Skipped++
				stats.MissingVulnerabilityID++
				continue
			}
			pkg := packages[vuln.PkgID]
			if pkg.Name == "" {
				pkg = packagesByNameVersion[vuln.PkgName+"\x00"+vuln.InstalledVersion]
			}
			pkgName := vuln.PkgName
			if pkgName == "" { pkgName = pkg.Name }
			pkgIdentifier := vuln.PkgIdentifier
			if pkgIdentifier == "" { pkgIdentifier = pkg.Identifier }
			installedVersion := vuln.InstalledVersion
			if installedVersion == "" { installedVersion = pkg.Version }
			identity := strings.Join([]string{result.Target, vuln.VulnerabilityID, pkgName, installedVersion}, "\x00")
			if _, exists := seen[identity]; exists {
				stats.Duplicate++
				stats.Skipped++
				continue
			}
			seen[identity] = struct{}{}
			records = append(records, VulnerabilityRecord{
				VulnerabilityID: vuln.VulnerabilityID, PkgID: vuln.PkgID, PkgName: pkgName,
				PkgIdentifier: pkgIdentifier, InstalledVersion: installedVersion,
				FixedVersion: vuln.FixedVersion, Status: vuln.Status, Severity: vuln.Severity,
				SeveritySource: vuln.SeveritySource, CVSSScore: extractCVSSScore(vuln.CVSS),
				Title: vuln.Title, Description: vuln.Description, PrimaryURL: vuln.PrimaryURL,
				References: vuln.References, PublishedDate: vuln.PublishedDate,
				LastModifiedDate: vuln.LastModifiedDate, Target: result.Target,
				Class: result.Class, Type: result.Type,
				RawJSON: append(json.RawMessage(nil), rawVulnerability...),
			})
		}
	}
	return records, stats, nil
}

func extractCVSSScore(raw json.RawMessage) *float64 {
	if len(raw) == 0 || string(raw) == "null" { return nil }
	var value any
	if json.Unmarshal(raw, &value) != nil { return nil }
	var find func(any) *float64
	find = func(candidate any) *float64 {
		if object, ok := candidate.(map[string]any); ok {
			for _, key := range []string{"V4Score", "V3Score", "V2Score", "Score"} {
				if score, exists := object[key]; exists {
					if parsed := parseCVSSNumber(score); parsed != nil { return parsed }
				}
			}
			for _, child := range object { if parsed := find(child); parsed != nil { return parsed } }
		}
		return nil
	}
	return find(value)
}

func parseCVSSNumber(value any) *float64 {
	var number float64
	switch typed := value.(type) {
	case float64: number = typed
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(typed), 64)
		if err != nil { return nil }
		number = parsed
	default: return nil
	}
	if number < 0 || number > 10 { return nil }
	return &number
}
