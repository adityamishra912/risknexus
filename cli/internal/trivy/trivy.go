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
	VulnerabilityID  json.RawMessage `json:"VulnerabilityID"`
	PkgID            json.RawMessage `json:"PkgID"`
	PkgName          json.RawMessage `json:"PkgName"`
	PkgIdentifier    *PackageIdentifier `json:"PkgIdentifier"`
	InstalledVersion json.RawMessage `json:"InstalledVersion"`
	FixedVersion     json.RawMessage `json:"FixedVersion"`
	Severity         json.RawMessage `json:"Severity"`
	SeveritySource   json.RawMessage `json:"SeveritySource"`
	CVSS             map[string]CVSSSource `json:"CVSS"`
	CWEIDs           StringList `json:"CweIDs"`
	Description      json.RawMessage `json:"Description"`
	Title            json.RawMessage `json:"Title"`
	References       StringList `json:"References"`
	PublishedDate    json.RawMessage `json:"PublishedDate"`
	LastModifiedDate json.RawMessage `json:"LastModifiedDate"`
	PrimaryURL       json.RawMessage `json:"PrimaryURL"`
	DataSource       *TrivyDataSource `json:"DataSource"`
	VendorIDs        json.RawMessage `json:"VendorIDs"`
	VendorSeverity   map[string]*float64 `json:"VendorSeverity"`
	Status           json.RawMessage `json:"Status"`
	Fingerprint      json.RawMessage `json:"Fingerprint"`
}

type PackageIdentifier struct {
	PURL string `json:"PURL"`
	UID  string `json:"UID"`
}

type TrivyDataSource struct {
	ID   string `json:"ID"`
	Name string `json:"Name"`
	URL  string `json:"URL"`
}

type CVSSSource struct {
	V2Score  *float64 `json:"V2Score"`
	V2Vector string   `json:"V2Vector"`
	V3Score  *float64 `json:"V3Score"`
	V3Vector string   `json:"V3Vector"`
	V40Score *float64 `json:"V40Score"`
	V40Vector string  `json:"V40Vector"`
}

type StringList []string

func (list *StringList) UnmarshalJSON(data []byte) error {
	if string(data) == "null" { *list = nil; return nil }
	var values []string
	if err := json.Unmarshal(data, &values); err == nil { *list = values; return nil }
	var value string
	if err := json.Unmarshal(data, &value); err == nil { *list = []string{value}; return nil }
	return fmt.Errorf("expected string or array of strings")
}

type ParseStats struct {
	ResultsFound         int
	VulnerabilitiesFound int
	Skipped              int
	MissingVulnerabilityID int
	InvalidRecord          int
	Duplicate              int
	TrivyVersion           string
	MalformedFields        []string
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
			vulnerabilityID, fieldErr := requiredString(vuln.VulnerabilityID, "VulnerabilityID")
			if fieldErr != "" {
				stats.InvalidRecord++
				stats.Skipped++
				stats.MalformedFields = append(stats.MalformedFields, fieldErr)
				continue
			}
			if strings.TrimSpace(vulnerabilityID) == "" {
				stats.Skipped++
				stats.MissingVulnerabilityID++
				continue
			}
			vulnerabilityPkgName := optionalString(vuln.PkgName)
			vulnerabilityInstalledVersion := optionalString(vuln.InstalledVersion)
			pkgID := optionalString(vuln.PkgID)
			pkg := packages[pkgID]
			if pkg.Name == "" {
				pkg = packagesByNameVersion[vulnerabilityPkgName+"\x00"+vulnerabilityInstalledVersion]
			}
			pkgName := vulnerabilityPkgName
			if pkgName == "" { pkgName = pkg.Name }
			pkgIdentifier := ""
			if vuln.PkgIdentifier != nil { pkgIdentifier = vuln.PkgIdentifier.PURL }
			if pkgIdentifier == "" { pkgIdentifier = pkg.Identifier }
			installedVersion := vulnerabilityInstalledVersion
			if installedVersion == "" { installedVersion = pkg.Version }
			identity := strings.Join([]string{result.Target, vulnerabilityID, pkgName, installedVersion}, "\x00")
			if _, exists := seen[identity]; exists {
				stats.Duplicate++
				stats.Skipped++
				continue
			}
			seen[identity] = struct{}{}
			records = append(records, VulnerabilityRecord{
				VulnerabilityID: vulnerabilityID, PkgID: pkgID, PkgName: pkgName,
				PkgIdentifier: pkgIdentifier, InstalledVersion: installedVersion,
				FixedVersion: optionalString(vuln.FixedVersion), Status: optionalString(vuln.Status), Severity: optionalString(vuln.Severity),
				SeveritySource: optionalString(vuln.SeveritySource), CVSSScore: extractCVSSScore(vuln.CVSS),
				Title: optionalString(vuln.Title), Description: optionalString(vuln.Description), PrimaryURL: optionalString(vuln.PrimaryURL),
				References: []string(vuln.References), PublishedDate: optionalString(vuln.PublishedDate),
				LastModifiedDate: optionalString(vuln.LastModifiedDate), Target: result.Target,
				Class: result.Class, Type: result.Type,
				RawJSON: append(json.RawMessage(nil), rawVulnerability...),
			})
		}
	}
	return records, stats, nil
}

func requiredString(raw json.RawMessage, field string) (string, string) {
	if len(raw) == 0 || string(raw) == "null" { return "", field + " is missing or null" }
	var value string
	if err := json.Unmarshal(raw, &value); err != nil { return "", field + " has unexpected type" }
	return value, ""
}

func optionalString(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" { return "" }
	var value string
	if json.Unmarshal(raw, &value) == nil { return value }
	return ""
}

func extractCVSSScore(sources map[string]CVSSSource) *float64 {
	for _, source := range []string{"nvd", "redhat", "ghsa", "bitnami", "julia"} {
		cvss, ok := sources[source]
		if !ok { continue }
		for _, score := range []*float64{cvss.V40Score, cvss.V3Score, cvss.V2Score} {
			if score != nil && *score >= 0 && *score <= 10 { return score }
		}
	}
	return nil
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
