package trivy

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

const TempOutputPath = "/tmp/trivy-vulnerabilities.json"

type Result struct {
	Target         string                 `json:"Target"`
	Class          string                 `json:"Class"`
	Vulnerabilities []VulnerabilityRecord `json:"Vulnerabilities"`
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
	Target            string   `json:"Target"`
	Type              string   `json:"Class"`
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
	var results []struct {
		Target         string            `json:"Target"`
		Class          string            `json:"Class"`
		Vulnerabilities []json.RawMessage `json:"Vulnerabilities"`
	}
	if err := json.Unmarshal(data, &results); err != nil {
		return nil, fmt.Errorf("[Trivy] Failed to parse existing scan result: %w", err)
	}
	var records []VulnerabilityRecord
	for _, result := range results {
		for _, rawVulnerability := range result.Vulnerabilities {
			var vuln VulnerabilityRecord
			if err := json.Unmarshal(rawVulnerability, &vuln); err != nil {
				return nil, fmt.Errorf("[Trivy] Failed to parse vulnerability record: %w", err)
			}
			copyRecord := vuln
			if copyRecord.Target == "" {
				copyRecord.Target = result.Target
			}
			if copyRecord.Type == "" {
				copyRecord.Type = result.Class
			}
			copyRecord.RawJSON = append(json.RawMessage(nil), rawVulnerability...)
			if strings.TrimSpace(copyRecord.VulnerabilityID) == "" {
				continue
			}
			records = append(records, copyRecord)
		}
	}
	return records, nil
}
