package glpi

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/risknexus/cli/internal/config"
)

type Settings struct {
	URL          string
	InventoryURL string
	InstallPath  string
	Version      string
}

const DefaultVersion = "v10.0.20"

func FromEnvironment() Settings {
	url := os.Getenv("RISKNEXUS_GLPI_URL")
	if url == "" {
		url = os.Getenv("CYBERNEXUS_GLPI_URL")
	} // Legacy compatibility fallback.
	if url == "" {
		url = "http://localhost/glpi"
	}
	inventory := os.Getenv("RISKNEXUS_GLPI_INVENTORY_URL")
	if inventory == "" {
		inventory = os.Getenv("CYBERNEXUS_GLPI_INVENTORY_URL")
	} // Legacy compatibility fallback.
	if inventory == "" {
		inventory = strings.TrimRight(url, "/") + "/front/inventory.php"
	}
	path := os.Getenv("RISKNEXUS_GLPI_PATH")
	if path == "" {
		path = os.Getenv("CYBERNEXUS_GLPI_PATH")
	} // Legacy compatibility fallback.
	if path == "" {
		path = "/var/www/glpi"
	}
	version := os.Getenv("RISKNEXUS_GLPI_VERSION")
	if version == "" {
		version = os.Getenv("CYBERNEXUS_GLPI_VERSION")
	} // Legacy compatibility fallback.
	if version == "" {
		version = DefaultVersion
	}
	return Settings{URL: strings.TrimRight(url, "/"), InventoryURL: inventory, InstallPath: path, Version: version}
}

func Detect(settings Settings) bool {
	_, err := os.Stat(filepath.Join(settings.InstallPath, "public", "index.php"))
	if err == nil {
		return true
	}
	_, err = os.Stat(filepath.Join(settings.InstallPath, "index.php"))
	return err == nil
}

func VerifyHTTP(ctx context.Context, settings Settings) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, settings.URL, nil)
	if err != nil {
		return fmt.Errorf("build GLPI health request: %w", err)
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return fmt.Errorf("GLPI is not reachable at %s: %w", settings.URL, err)
	}
	defer response.Body.Close()
	if response.StatusCode >= 400 {
		return fmt.Errorf("GLPI returned HTTP %d at %s", response.StatusCode, settings.URL)
	}
	return nil
}

func AgentConfig(settings Settings) string {
	return fmt.Sprintf("server = %s\nno-ssl-check\nlogger = stderr\n", settings.InventoryURL)
}

func WriteAgentConfig(settings Settings) error {
	path := "/etc/glpi-agent/agent.cfg"
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return fmt.Errorf("create GLPI Agent config directory: %w", err)
	}
	if err := os.WriteFile(path, []byte(AgentConfig(settings)), 0644); err != nil {
		return fmt.Errorf("write GLPI Agent config: %w", err)
	}
	return nil
}

func DatabaseEnv(value config.MySQLConfig) map[string]string {
	return map[string]string{"MYSQL_HOST": value.Host, "MYSQL_PORT": fmt.Sprint(value.Port), "MYSQL_DATABASE": value.Database, "MYSQL_USER": value.Username}
}
