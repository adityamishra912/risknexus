package trivy

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const TempOutputPath = "/tmp/trivy-vulnerabilities.json"

var exactCommand = []string{"sudo", "trivy", "fs", "--scanners", "vuln", "--offline-scan", "--skip-dirs", "/var/lib/containerd", "--format", "json", "--output", TempOutputPath, "/"}

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

func BuildCommand() []string { return append([]string(nil), exactCommand...) }

func FileExists() bool {
	_, err := os.Stat(TempOutputPath)
	return err == nil
}

func RunScan() error {
	if _, err := exec.LookPath("trivy"); err != nil {
		return fmt.Errorf("Trivy executable not found.")
	}
	cmd := exec.Command(exactCommand[0], exactCommand[1:]...)
	cmd.Stdout = nil
	cmd.Stderr = nil
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("[Trivy] Scan failed.")
	}
	if !FileExists() {
		return fmt.Errorf("[Trivy] Scan completed but JSON output was not found.")
	}
	return nil
}

func ParseScanFile(path string) ([]VulnerabilityRecord, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("[Trivy] Failed to parse scan result.")
	}
	var results []Result
	if err := json.Unmarshal(data, &results); err != nil {
		return nil, fmt.Errorf("[Trivy] Failed to parse scan result.")
	}
	var records []VulnerabilityRecord
	for _, result := range results {
		for _, vuln := range result.Vulnerabilities {
			copyRecord := vuln
			if copyRecord.Target == "" {
				copyRecord.Target = result.Target
			}
			if copyRecord.Type == "" {
				copyRecord.Type = result.Class
			}
			if copyRecord.RawJSON == nil {
				if raw, marshalErr := json.Marshal(vuln); marshalErr == nil {
					copyRecord.RawJSON = raw
				}
			}
			if strings.TrimSpace(copyRecord.VulnerabilityID) == "" {
				continue
			}
			records = append(records, copyRecord)
		}
	}
	return records, nil
}
