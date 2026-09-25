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
	Type           string                 `json:"Type"`
	Vulnerabilities []VulnerabilityRecord `json:"Vulnerabilities"`
}

type scanEnvelope struct {
	Results []json.RawMessage `json:"Results"`
}

type ParseStats struct {
	ResultsFound       int
	VulnerabilitiesFound int
	Skipped            int
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
	records, _, err := ParseTrivyResultsWithStats(data)
	return records, err
}

func ParseTrivyResultsWithStats(data []byte) ([]VulnerabilityRecord, ParseStats, error) {
	var rawResults []json.RawMessage
	var envelope scanEnvelope
	if err := json.Unmarshal(data, &envelope); err == nil && envelope.Results != nil {
		rawResults = envelope.Results
	} else if err := json.Unmarshal(data, &rawResults); err != nil {
		return nil, ParseStats{}, fmt.Errorf("[Trivy] Failed to parse existing scan result: %w", err)
	}

	stats := ParseStats{ResultsFound: len(rawResults)}
	var results []struct {
		Target         string            `json:"Target"`
		Class          string            `json:"Class"`
		Type           string            `json:"Type"`
		Vulnerabilities []json.RawMessage `json:"Vulnerabilities"`
	}
	for _, rawResult := range rawResults {
		var result struct {
			Target         string            `json:"Target"`
			Class          string            `json:"Class"`
			Type           string            `json:"Type"`
			Vulnerabilities []json.RawMessage `json:"Vulnerabilities"`
		}
		if err := json.Unmarshal(rawResult, &result); err != nil {
			return nil, stats, fmt.Errorf("[Trivy] Failed to parse Result object: %w", err)
		}
		results = append(results, result)
	}
	var records []VulnerabilityRecord
	for _, result := range results {
		for _, rawVulnerability := range result.Vulnerabilities {
			stats.VulnerabilitiesFound++
			var vuln VulnerabilityRecord
			if err := json.Unmarshal(rawVulnerability, &vuln); err != nil {
				return nil, stats, fmt.Errorf("[Trivy] Failed to parse vulnerability record: %w", err)
			}
			copyRecord := vuln
			if copyRecord.Target == "" {
				copyRecord.Target = result.Target
			}
			if copyRecord.Type == "" {
				copyRecord.Type = result.Type
			}
			if copyRecord.Type == "" {
				copyRecord.Type = result.Class
			}
			copyRecord.RawJSON = append(json.RawMessage(nil), rawVulnerability...)
			if strings.TrimSpace(copyRecord.VulnerabilityID) == "" {
				stats.Skipped++
				continue
			}
			records = append(records, copyRecord)
		}
	}
	return records, stats, nil
}
