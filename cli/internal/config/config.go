package config

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"golang.org/x/term"
)

type MySQLConfig struct {
	Host     string
	Port     int
	Database string
	Username string
	Password string
	GLPIURL string
	GLPIInventoryURL string
	RiskNexusHost string
	CyberNexusHost string
	GeminiAPIKey string
	NextPublicAPIURL string
	MySQLHostContainer string
}

type BrowserURLs struct {
	GLPIURL string
	GLPIInventoryURL string
	NextPublicAPIURL string
}

func DefaultPath() string {
	if configured := os.Getenv("RISKNEXUS_CONFIG_FILE"); configured != "" {
		return configured
	}
	if configured := os.Getenv("CYBERNEXUS_CONFIG_FILE"); configured != "" {
		// Legacy fallback for installations created before the RiskNexus rename.
		return configured
	}
	if runtime.GOOS != "windows" {
		if _, err := os.Stat("/etc/risknexus"); err == nil {
			return "/etc/risknexus/.env"
		}
		if _, err := os.Stat("/etc/cybernexus"); err == nil {
			// Legacy fallback for an existing CyberNexus configuration directory.
			return "/etc/cybernexus/.env"
		}
		return "/etc/risknexus/.env"
	}
	return ".env"
}

func Load(path string) (MySQLConfig, error) {
	values, err := readEnv(path)
	if err != nil {
		return MySQLConfig{}, err
	}
	port := 3306
	if raw := values["MYSQL_PORT"]; raw != "" {
		port, err = strconv.Atoi(raw)
		if err != nil {
			return MySQLConfig{}, fmt.Errorf("MYSQL_PORT must be a number: %w", err)
		}
	}
	hostName := values["RISKNEXUS_HOST"]
	if hostName == "" {
		// Legacy fallback for existing environment files.
		hostName = values["CYBERNEXUS_HOST"]
	}
	return MySQLConfig{Host: values["MYSQL_HOST"], Port: port, Database: values["MYSQL_DATABASE"], Username: values["MYSQL_USER"], Password: values["MYSQL_PASSWORD"], GLPIURL: values["GLPI_URL"], GLPIInventoryURL: values["GLPI_INVENTORY_URL"], RiskNexusHost: hostName, CyberNexusHost: hostName, GeminiAPIKey: values["GEMINI_API_KEY"], NextPublicAPIURL: values["NEXT_PUBLIC_API_URL"], MySQLHostContainer: values["MYSQL_HOST_CONTAINER"]}, nil
}

func ValidateRiskNexusHost(host string) error {
	if host == "" { return errors.New("RiskNexus host/IP address is required") }
	if strings.ContainsAny(host, "/:\\ \t\r\n") { return fmt.Errorf("invalid RiskNexus host %q: enter a hostname or IP address without a scheme, port, path, or whitespace", host) }
	if net.ParseIP(host) != nil { return nil }
	for _, label := range strings.Split(host, ".") {
		if label == "" || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' { return fmt.Errorf("invalid RiskNexus hostname %q", host) }
		for _, character := range label {
			if (character < 'a' || character > 'z') && (character < 'A' || character > 'Z') && (character < '0' || character > '9') && character != '-' { return fmt.Errorf("invalid RiskNexus hostname %q", host) }
		}
	}
	return nil
}

func ValidateCyberNexusHost(host string) error {
	return ValidateRiskNexusHost(host)
}

func GenerateBrowserURLs(host string) (BrowserURLs, error) {
	if err := ValidateRiskNexusHost(host); err != nil { return BrowserURLs{}, err }
	glpiURL := fmt.Sprintf("http://%s/glpi", host)
	return BrowserURLs{GLPIURL: glpiURL, GLPIInventoryURL: glpiURL + "/front/inventory.php", NextPublicAPIURL: fmt.Sprintf("http://%s:8000/api/v1", host)}, nil
}

func PromptRiskNexusHost(in io.Reader, out io.Writer, existing string) (string, error) {
	reader := bufio.NewReader(in)
	for {
		if existing == "" { fmt.Fprint(out, "Enter RiskNexus host/IP address: ") } else { fmt.Fprintf(out, "Enter RiskNexus host/IP address [%s]: ", existing) }
		line, err := reader.ReadString('\n')
		if err != nil && !errors.Is(err, io.EOF) { return "", err }
		host := strings.TrimSuffix(strings.TrimSuffix(line, "\n"), "\r")
		if host == "" { host = existing }
		if err := ValidateRiskNexusHost(host); err != nil { fmt.Fprintf(out, "✗ %v\n", err); if errors.Is(err, io.EOF) { return "", err }; continue }
		return host, nil
	}
}

func PromptCyberNexusHost(in io.Reader, out io.Writer, existing string) (string, error) {
	return PromptRiskNexusHost(in, out, existing)
}

func PromptGeminiAPIKey(out io.Writer, existing string) (string, error) {
	fmt.Fprint(out, "Gemini API Key: ")
	password, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Fprintln(out)
	if err != nil { return "", err }
	if string(password) == "" && existing != "" { return existing, nil }
	return strings.TrimSpace(string(password)), nil
}

func Prompt(in io.Reader, out io.Writer, existing *MySQLConfig, passwordReader func() ([]byte, error)) (MySQLConfig, error) {
	reader := bufio.NewReader(in)
	value := func(label, fallback string) (string, error) {
		if fallback != "" {
			fmt.Fprintf(out, "%s [%s]: ", label, fallback)
		} else {
			fmt.Fprintf(out, "%s: ", label)
		}
		line, err := reader.ReadString('\n')
		if err != nil && !errors.Is(err, io.EOF) {
			return "", err
		}
		line = strings.TrimSpace(line)
		if line == "" {
			return fallback, nil
		}
		return line, nil
	}

	defaults := MySQLConfig{Host: "127.0.0.1", Port: 3306, Database: "glpi"}
	if existing != nil {
		defaults = *existing
	}
	host, err := value("MySQL Host", defaults.Host)
	if err != nil { return MySQLConfig{}, err }
	portText, err := value("MySQL Port", strconv.Itoa(defaults.Port))
	if err != nil { return MySQLConfig{}, err }
	port, err := strconv.Atoi(portText)
	if err != nil || port < 1 || port > 65535 {
		return MySQLConfig{}, fmt.Errorf("invalid MySQL port %q: enter a number between 1 and 65535", portText)
	}
	database, err := value("MySQL Database", defaults.Database)
	if err != nil { return MySQLConfig{}, err }
	username, err := value("MySQL Username", defaults.Username)
	if err != nil { return MySQLConfig{}, err }
	if username == "" { return MySQLConfig{}, errors.New("MySQL username is required") }

	fmt.Fprint(out, "MySQL Password: ")
	password, err := passwordReader()
	fmt.Fprintln(out)
	if err != nil { return MySQLConfig{}, fmt.Errorf("read MySQL password: %w", err) }
	if len(password) == 0 && existing != nil {
		password = []byte(existing.Password)
	}
	if len(password) == 0 { return MySQLConfig{}, errors.New("MySQL password is required") }
	return MySQLConfig{Host: host, Port: port, Database: database, Username: username, Password: string(password)}, nil
}

func Save(path string, value MySQLConfig) error {
	if value.Host == "" || value.Database == "" || value.Username == "" || value.Password == "" {
		return errors.New("refusing to save incomplete MySQL configuration")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil { return fmt.Errorf("create config directory: %w", err) }
	containerHost := value.Host
	if value.Host == "127.0.0.1" || value.Host == "localhost" { containerHost = "host.docker.internal" }
	if value.MySQLHostContainer != "" { containerHost = value.MySQLHostContainer }
	hostName := value.RiskNexusHost
	if hostName == "" && value.CyberNexusHost != "" { hostName = value.CyberNexusHost }
	if hostName == "" { hostName = value.Host }
	if err := ValidateRiskNexusHost(hostName); err != nil { return err }
	configHost := fmt.Sprintf("http://%s:3000,http://localhost:3000,http://127.0.0.1:3000", hostName)
	contents := fmt.Sprintf("RISKNEXUS_HOST=%s\nCYBERNEXUS_HOST=%s\nMYSQL_HOST=%s\nMYSQL_HOST_CONTAINER=%s\nMYSQL_PORT=%d\nMYSQL_DATABASE=%s\nMYSQL_USER=%s\nMYSQL_PASSWORD=%s\nGLPI_URL=%s\nGLPI_INVENTORY_URL=%s\nNEXT_PUBLIC_API_URL=%s\nCORS_ORIGINS=%s\nGEMINI_API_KEY=%s\nRISKNEXUS_CONFIG_FILE=%s\nCYBERNEXUS_CONFIG_FILE=%s\n", quote(hostName), quote(hostName), quote(value.Host), quote(containerHost), value.Port, quote(value.Database), quote(value.Username), quote(value.Password), quote(value.GLPIURL), quote(value.GLPIInventoryURL), quote(value.NextPublicAPIURL), quote(configHost), quote(value.GeminiAPIKey), quote(path), quote(path))
	if err := os.WriteFile(path, []byte(contents), 0600); err != nil { return fmt.Errorf("write config %s: %w", path, err) }
	return nil
}

func readEnv(path string) (map[string]string, error) {
	file, err := os.Open(path)
	if err != nil { return nil, err }
	defer file.Close()
	values := map[string]string{}
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") { continue }
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 { continue }
		value := strings.TrimSpace(parts[1])
		if unquoted, err := strconv.Unquote(value); err == nil {
			value = unquoted
		} else {
			value = strings.Trim(value, "\"'")
		}
		values[strings.TrimSpace(parts[0])] = value
	}
	if err := scanner.Err(); err != nil { return nil, fmt.Errorf("read config: %w", err) }
	return values, nil
}

func quote(value string) string { return strconv.Quote(value) }
