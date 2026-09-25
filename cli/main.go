package main

import (
	"context"
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/cybernexus/cli/internal/config"
	mysqlcheck "github.com/cybernexus/cli/internal/mysql"
	"github.com/cybernexus/cli/internal/glpi"
	"github.com/cybernexus/cli/internal/system"
	"github.com/cybernexus/cli/internal/trivy"
	"golang.org/x/term"
)

var debug bool

func main() {
	flag.Usage = usage
	flag.BoolVar(&debug, "debug", false, "show command output and diagnostic details")
	flag.Parse()
	if flag.NArg() == 0 { usage(); os.Exit(2) }
	if debug {
		fmt.Printf("[DEBUG] OS=%s ARCH=%s CWD=%s\n", runtime.GOOS, runtime.GOARCH, currentDirectory())
	}
	var err error
	switch flag.Arg(0) {
	case "configure": err = configure()
	case "install", "start": err = start()
	case "status": err = status()
	case "stop": err = compose("down")
	case "logs": err = compose("logs", "--tail=100")
	default: err = fmt.Errorf("unknown command %q", flag.Arg(0))
	}
	if err != nil { fmt.Fprintf(os.Stderr, "✗ ERROR: %v\n", err); os.Exit(1) }
}

func usage() {
	fmt.Fprintln(os.Stderr, "CyberNexus CLI")
	fmt.Fprintln(os.Stderr, "Usage: cybernexus [--debug] <install|configure|start|stop|status|logs>")
}

func configure() error {
	path := config.DefaultPath()
	fmt.Println("CyberNexus MySQL Configuration")
	fmt.Printf("Configuration file: %s\n\n", path)
	var existing *config.MySQLConfig
	if current, err := config.Load(path); err == nil { existing = &current }
	for {
		value, err := config.Prompt(os.Stdin, os.Stdout, existing, readPassword)
		if err != nil { return err }
		value.CyberNexusHost, err = config.PromptCyberNexusHost(os.Stdin, os.Stdout, "")
		if err != nil { return err }
		browserURLs, err := config.GenerateBrowserURLs(value.CyberNexusHost)
		if err != nil { return err }
		value.GLPIURL = browserURLs.GLPIURL
		value.GLPIInventoryURL = browserURLs.GLPIInventoryURL
		value.NextPublicAPIURL = browserURLs.NextPublicAPIURL
		value.MySQLHostContainer = "host.docker.internal"
		fmt.Println("\n→ Testing MySQL connection...")
		result, err := mysqlcheck.Check(context.Background(), value)
		if err != nil {
			fmt.Printf("✗ MySQL connection failed\nHost: %s\nPort: %d\nDatabase: %s\nUsername: %s\nError: %v\n", value.Host, value.Port, value.Database, value.Username, err)
			if !askYesNo("Retry configuration? [Y/n]: ", true) { return errors.New("MySQL configuration was not saved") }
			existing = &value
			continue
		}
		if !result.DatabaseExists {
			fmt.Printf("✓ Connected to MySQL\n⚠ Database %q does not exist.\n1. Create database\n2. Enter a different database\n3. Exit\n", value.Database)
			choice := readLine("Select an option [1]: ")
			if choice == "2" { existing = &value; continue }
			if choice != "1" { return errors.New("database does not exist; configuration was not saved") }
			if err := mysqlcheck.CreateDatabase(context.Background(), value); err != nil { return err }
			result.DatabaseExists = true
		}
		if !result.LooksLikeGLPI { fmt.Printf("⚠ Database %q does not currently contain expected GLPI tables; continuing is allowed for a new GLPI installation.\n", value.Database) }
		if err := config.Save(path, value); err != nil { return err }
		fmt.Printf("✓ MySQL connection successful\n✓ Configuration saved securely at %s\n", path)
		return nil
	}
}

func start() error {
	fmt.Println("CyberNexus Startup")
	fmt.Println("[1/10] Detecting system...")
	info, err := system.Detect()
	if err != nil { return err }
	fmt.Printf("✓ %s %s\n✓ %s\n✓ %s RAM\n✓ %s available disk space\n✓ Elevated privileges available\n", info.Distribution, info.Version, info.Architecture, info.RAMGB, info.DiskGB)

	fmt.Println("[2/10] Checking dependencies...")
	dependencies := system.Dependencies()
	missing := system.Missing(dependencies)
	for _, dependency := range dependencies {
		if containsDependency(missing, dependency.Name) { fmt.Printf("✗ %-22s missing (required: %s)\n", dependency.Name, dependency.Required) } else { fmt.Printf("✓ %-22s installed (required: %s)\n", dependency.Name, dependency.Required) }
	}
	if len(missing) > 0 {
		fmt.Println("The following required components are missing:")
		for _, dependency := range missing { fmt.Printf("- %s\n", dependency.Name) }
		if !askYesNo("Install these components now? [y/N]: ", false) { return errors.New("installation cancelled by user; no dependency changes were made") }
		if err := installDependencies(missing); err != nil { return stageError("dependency installation", err) }
	}

	fmt.Println("[3/10] Configuring MySQL...")
	path := config.DefaultPath()
	value, err := configuredMySQL(path)
	if err != nil { return stageError("MySQL configuration", err) }
	if value.CyberNexusHost == "" {
		value.CyberNexusHost, err = config.PromptCyberNexusHost(os.Stdin, os.Stdout, "")
		if err != nil { return stageError("CyberNexus host configuration", err) }
	} else if err := config.ValidateCyberNexusHost(value.CyberNexusHost); err != nil {
		return stageError("CyberNexus host configuration", err)
	}
	browserURLs, err := config.GenerateBrowserURLs(value.CyberNexusHost)
	if err != nil { return stageError("CyberNexus host configuration", err) }
	value.GLPIURL = browserURLs.GLPIURL
	value.GLPIInventoryURL = browserURLs.GLPIInventoryURL
	value.NextPublicAPIURL = browserURLs.NextPublicAPIURL
	value.MySQLHostContainer = "host.docker.internal"
	settings := glpi.FromEnvironment()
	settings.URL = value.GLPIURL
	settings.InventoryURL = value.GLPIInventoryURL
	value.GLPIURL = settings.URL
	value.GLPIInventoryURL = settings.InventoryURL
	if err := config.Save(path, value); err != nil { return stageError("environment configuration", err) }
	fmt.Printf("✓ Secure configuration saved at %s\n", path)

	fmt.Println("[4/10] Configuring GLPI...")
	databaseState, err := mysqlcheck.Check(context.Background(), value)
	if err != nil { return stageError("GLPI database inspection", err) }
	if !glpi.Detect(settings) {
		fmt.Printf("⚠ GLPI was not detected at %s.\n", settings.InstallPath)
		if !askYesNo("Download and install the configured GLPI release now? [Y/n]: ", true) { return errors.New("GLPI installation cancelled by user") }
		if err := installGLPI(settings, value, !databaseState.LooksLikeGLPI); err != nil { return stageError("GLPI installation", err) }
	} else {
		fmt.Printf("✓ Existing GLPI installation found at %s\n", settings.InstallPath)
		if !databaseState.LooksLikeGLPI {
			if err := installGLPI(settings, value, true); err != nil { return stageError("GLPI database initialization", err) }
		}
	}
	if err := configureApache(settings); err != nil { return stageError("Apache configuration", err) }
	if err := glpi.VerifyHTTP(context.Background(), settings); err != nil { return stageError("GLPI health check", err) }

	fmt.Println("[5/10] Configuring GLPI Inventory...")
	fmt.Println("→ Checking GLPI inventory configuration")
	if err := mysqlcheck.ConfigureInventory(context.Background(), value, func(format string, args ...any) { fmt.Printf(format+"\n", args...) }); err != nil {
		return stageError("GLPI Inventory configuration", err)
	}

	fmt.Println("[6/10] Configuring GLPI Agent...")
	if _, err := exec.LookPath("glpi-agent"); err != nil {
		if err := runCommand("/", "apt-get", "install", "-y", "glpi-agent"); err != nil { return stageError("GLPI Agent installation", err) }
	}
	if err := glpi.WriteAgentConfig(settings); err != nil { return stageError("GLPI Agent configuration", err) }
	if err := runCommand("/", "systemctl", "enable", "--now", "glpi-agent"); err != nil { return stageError("GLPI Agent startup", err) }

	fmt.Println("[7/10] Collecting and verifying inventory...")
	if err := runCommand("/", "glpi-agent", "--debug", "--force"); err != nil { return stageError("inventory collection", err) }
	counts, err := mysqlcheck.Inventory(context.Background(), value)
	if err != nil { return stageError("inventory verification", err) }
	if counts.Computers == 0 { return stageError("inventory verification", errors.New("no computer inventory was received; inspect glpi-agent and Apache logs")) }
	fmt.Printf("✓ Computers: %d\n✓ Software: %d\n✓ Software versions: %d\n", counts.Computers, counts.Softwares, counts.SoftwareVersions)

	fmt.Println("[8/10] Importing existing Trivy vulnerability results...")
	trivyPath := trivy.TempOutputPath
	fmt.Printf("[Trivy] Using existing scan result:\n%s\n", trivyPath)
	data, err := trivy.LoadTrivyJSON(trivyPath)
	if err != nil { return stageError("Trivy JSON loading", err) }
	fmt.Println("[Trivy] JSON loaded successfully")
	records, parseStats, err := trivy.ParseTrivyResultsWithStats(data)
	if err != nil { return stageError("Trivy JSON parsing", err) }
	fmt.Printf("[Trivy] Results found: %d\n", parseStats.ResultsFound)
	fmt.Printf("[Trivy] Vulnerabilities found: %d\n", parseStats.VulnerabilitiesFound)
	if parseStats.Skipped > 0 { fmt.Printf("[Trivy] Skipped: %d vulnerabilities without an identifier\n", parseStats.Skipped) }
	if err := mysqlcheck.EnsureTrivyTable(context.Background(), value); err != nil { return stageError("Trivy table setup", err) }
	fmt.Println("[Trivy] MySQL table ready")
	count, err := mysqlcheck.ImportTrivyVulnerabilities(context.Background(), value, records)
	if err != nil { return stageError("Trivy MySQL import", err) }
	fmt.Printf("[Trivy] Imported: %d vulnerabilities\n", count)
	verification, err := mysqlcheck.VerifyTrivyImport(context.Background(), value)
	if err != nil { return stageError("Trivy import verification", err) }
	fmt.Printf("[Trivy] SELECT COUNT(*) FROM trivy_vulnerabilities: %d\n", verification.Total)
	fmt.Println("[Trivy] Sample: vulnerability_id, asset_id, cve_id, severity, cvss_score")
	for _, sample := range verification.Sample {
		fmt.Printf("[Trivy] %s, %s, %s, %s, %v\n", sample.VulnerabilityID, sample.Target, sample.CVEID, sample.Severity, sample.CVSSScore)
	}

	fmt.Println("[9/10] Starting FastAPI and Next.js...")
	if err := compose("up", "-d", "--build"); err != nil { return stageError("application services", err) }
	root, err := repositoryRoot()
	if err != nil { return stageError("Docker network discovery", err) }
	composeFile := filepath.Join(root, "deployment", "docker-compose.yml")
	configPath, err := filepath.Abs(config.DefaultPath())
	if err != nil { return stageError("Docker network discovery", err) }
	subnet, err := dockerNetworkSubnet(root, composeFile, configPath)
	if err != nil { return stageError("Docker network discovery", err) }
	fmt.Printf("→ Docker network subnet: %s\n", subnet)
	var adminRequired *mysqlcheck.AdminCredentialsRequiredError
	if err := mysqlcheck.EnsureDockerNetworkAccess(context.Background(), value, subnet); err != nil {
		if !errors.As(err, &adminRequired) { return stageError("MySQL Docker network authorization", err) }
		fmt.Printf("⚠ %v\n", err)
		admin, promptErr := promptMySQLAdminCredentials()
		if promptErr != nil { return stageError("MySQL Docker network authorization", promptErr) }
		if err := mysqlcheck.ProvisionDockerNetworkAccess(context.Background(), value, subnet, admin); err != nil {
			admin.Password = ""
			return stageError("MySQL Docker network authorization", err)
		}
		admin.Password = ""
	}
	fmt.Println("✓ MySQL access for the CyberNexus Docker network is configured")

	fmt.Println("[10/10] Running health checks...")
	if err := waitHTTP("http://localhost:8000/", 30); err != nil { return stageError("FastAPI health check", err) }
	if err := waitHTTP("http://localhost:3000/", 30); err != nil { return stageError("Next.js health check", err) }
	if err := checkDockerServices(); err != nil { return stageError("Docker service health check", err) }

	fmt.Println("[10/10] CyberNexus is ready")
	fmt.Printf("Dashboard: http://%s:3000\nGLPI:     %s\nAPI:      %s\n", value.CyberNexusHost, settings.URL, value.NextPublicAPIURL)
	return nil
}

func configuredMySQL(path string) (config.MySQLConfig, error) {
	if current, err := config.Load(path); err == nil {
		if result, checkErr := mysqlcheck.Check(context.Background(), current); checkErr == nil {
			if result.DatabaseExists { fmt.Println("✓ Existing MySQL configuration is valid") ; return current, nil }
		}
	}
	for {
		value, err := config.Prompt(os.Stdin, os.Stdout, nil, readPassword)
		if err != nil { return config.MySQLConfig{}, err }
		fmt.Println("→ Testing MySQL connection...")
		result, err := mysqlcheck.Check(context.Background(), value)
		if err != nil { fmt.Printf("✗ MySQL connection failed: %v\n", err); if askYesNo("Retry configuration? [Y/n]: ", true) { continue }; return config.MySQLConfig{}, errors.New("MySQL configuration cancelled") }
		if !result.DatabaseExists {
			fmt.Printf("⚠ Database %q does not exist.\n", value.Database)
			if !askYesNo("Create it? [y/N]: ", false) { return config.MySQLConfig{}, errors.New("database creation declined") }
			if err := mysqlcheck.CreateDatabase(context.Background(), value); err != nil { return config.MySQLConfig{}, err }
		}
		return value, nil
	}
}

func promptMySQLAdminCredentials() (mysqlcheck.AdminCredentials, error) {
	fmt.Println("MySQL administrative credentials are required only to authorize the backend Docker network.")
	username := readLine("MySQL administrative username: ")
	if username == "" { return mysqlcheck.AdminCredentials{}, errors.New("MySQL administrative username is required") }
	fmt.Print("MySQL administrative password: ")
	password, err := readPassword()
	fmt.Println()
	if err != nil { return mysqlcheck.AdminCredentials{}, fmt.Errorf("read MySQL administrative password: %w", err) }
	if len(password) == 0 { return mysqlcheck.AdminCredentials{}, errors.New("MySQL administrative password is required") }
	return mysqlcheck.AdminCredentials{Username: username, Password: string(password)}, nil
}

func installDependencies(missing []system.Dependency) error {
	packages := make([]string, 0, len(missing)+5)
	for _, dependency := range missing { packages = append(packages, dependency.Package) }
	packages = append(packages, "php-curl", "php-gd", "php-xml", "php-mbstring", "php-zip", "php-intl", "unzip")
	if err := runCommand("/", "apt-get", "update"); err != nil { return err }
	return runCommand("/", "apt-get", append([]string{"install", "-y"}, unique(packages)...)...)
}

func installGLPI(settings glpi.Settings, value config.MySQLConfig, initializeDatabase bool) error {
	tag := settings.Version
	archiveURL := fmt.Sprintf("https://github.com/glpi-project/glpi/releases/download/%s/glpi-%s.tgz", tag, strings.TrimPrefix(tag, "v"))
	archive := filepath.Join(os.TempDir(), "glpi-"+strings.TrimPrefix(tag, "v")+".tgz")
	if _, err := os.Stat(settings.InstallPath); os.IsNotExist(err) {
		if err := runCommand("/", "curl", "--fail", "--location", "--output", archive, archiveURL); err != nil { return err }
		if err := runCommand("/var/www", "tar", "-xzf", archive); err != nil { return err }
		if err := runCommand("/", "chown", "-R", "www-data:www-data", settings.InstallPath); err != nil { return err }
	}
	if !initializeDatabase { return nil }
	passwordArg := "--db-password=" + value.Password
	displayPasswordArg := "--db-password=********"
	return runCommandDisplayed(settings.InstallPath, []string{"php", "bin/console", "db:install", "--no-interaction", "--db-host=" + value.Host, "--db-name=" + value.Database, "--db-user=" + value.Username, passwordArg}, []string{"php", "bin/console", "db:install", "--no-interaction", "--db-host=" + value.Host, "--db-name=" + value.Database, "--db-user=" + value.Username, displayPasswordArg})
}

func configureApache(settings glpi.Settings) error {
	content := fmt.Sprintf("<VirtualHost *:80>\n    DocumentRoot %s/public\n    <Directory %s/public>\n        AllowOverride All\n        Require all granted\n    </Directory>\n</VirtualHost>\n", settings.InstallPath, settings.InstallPath)
	if err := os.WriteFile("/etc/apache2/sites-available/cybernexus-glpi.conf", []byte(content), 0644); err != nil { return fmt.Errorf("write Apache site: %w", err) }
	if err := runCommand("/", "a2enmod", "rewrite"); err != nil { return err }
	if err := runCommand("/", "a2ensite", "cybernexus-glpi.conf"); err != nil { return err }
	return runCommand("/", "systemctl", "reload", "apache2")
}

func status() error {
	path := config.DefaultPath()
	value, err := config.Load(path)
	if err != nil { return fmt.Errorf("load configuration %s: %w", path, err) }
	result, err := mysqlcheck.Check(context.Background(), value)
	if err != nil { return err }
	fmt.Println("CyberNexus Status")
	fmt.Printf("MySQL           ✓ Connected\nHost            %s\nPort            %d\nDatabase        %s\nUser            %s\nPassword        ********\nGLPI tables     %t\n", value.Host, value.Port, value.Database, value.Username, result.LooksLikeGLPI)
	return nil
}

func compose(args ...string) error {
	root, err := repositoryRoot()
	if err != nil { return err }
	composeFile := filepath.Join(root, "deployment", "docker-compose.yml")
	configPath, err := filepath.Abs(config.DefaultPath())
	if err != nil { return fmt.Errorf("resolve configuration path: %w", err) }
	return runCommand(root, "docker", append([]string{"compose", "--env-file", configPath, "-f", composeFile}, args...)...)
}

func currentDirectory() string { value, err := os.Getwd(); if err != nil { return "<unknown>" }; return value }

func runCommand(dir, name string, args ...string) error {
	return runCommandDisplayed(dir, append([]string{name}, args...), append([]string{name}, args...))
}

func runCommandDisplayed(dir string, actual, display []string) error {
	if len(actual) == 0 { return errors.New("empty command") }
	fmt.Printf("→ Running: %s\n", strings.Join(display, " "))
	command := exec.Command(actual[0], actual[1:]...)
	command.Dir = dir
	var stdout, stderr bytes.Buffer
	command.Stdout = io.MultiWriter(os.Stdout, &stdout)
	command.Stderr = io.MultiWriter(os.Stderr, &stderr)
	err := command.Run()
	if err == nil { return nil }
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) { return fmt.Errorf("command failed with exit code %d\nSTDOUT:\n%s\nSTDERR:\n%s\n%w", exitErr.ExitCode(), stdout.String(), stderr.String(), err) }
	return fmt.Errorf("could not execute command: %w", err)
}

func waitHTTP(url string, attempts int) error {
	client := &http.Client{Timeout: 2 * time.Second}
	var last error
	for attempt := 0; attempt < attempts; attempt++ {
		response, err := client.Get(url)
		if err == nil {
			response.Body.Close()
			if response.StatusCode < 500 { return nil }
			last = fmt.Errorf("HTTP %d", response.StatusCode)
		} else { last = err }
		time.Sleep(time.Second)
	}
	return fmt.Errorf("%s did not become healthy: %w", url, last)
}

func checkDockerServices() error {
	root, err := repositoryRoot()
	if err != nil { return err }
	composeFile := filepath.Join(root, "deployment", "docker-compose.yml")
	configPath, err := filepath.Abs(config.DefaultPath())
	if err != nil { return err }
	output, err := commandOutputInDir(root, "docker", "compose", "--env-file", configPath, "-f", composeFile, "ps", "--format", "json")
	if err != nil { return err }
	if !strings.Contains(strings.ToLower(output), "running") && !strings.Contains(strings.ToLower(output), "up") { return fmt.Errorf("Docker Compose reports no running application services: %s", strings.TrimSpace(output)) }
	return nil
}

func commandOutput(name string, args ...string) (string, error) {
	return commandOutputInDir("", name, args...)
}

func commandOutputInDir(dir, name string, args ...string) (string, error) {
	command := exec.Command(name, args...)
	if dir != "" { command.Dir = dir }
	output, err := command.CombinedOutput()
	if err != nil { return string(output), fmt.Errorf("%s %s failed: %w\nOutput:\n%s", name, strings.Join(args, " "), err, output) }
	return string(output), nil
}

func dockerNetworkSubnet(root, composeFile, configPath string) (string, error) {
	composeArgs := []string{"compose", "--env-file", configPath, "-f", composeFile, "ps", "-q", "backend"}
	containerIDOutput, err := commandOutputInDir(root, "docker", composeArgs...)
	if err != nil { return "", err }
	containerID := strings.TrimSpace(containerIDOutput)
	if containerID == "" { return "", errors.New("Docker Compose did not return a backend container ID") }
	networksJSON, err := commandOutput("docker", "inspect", "--format", "{{json .NetworkSettings.Networks}}", containerID)
	if err != nil { return "", err }
	var networks map[string]struct{ NetworkID string `json:"NetworkID"` }
	if err := json.Unmarshal([]byte(strings.TrimSpace(networksJSON)), &networks); err != nil { return "", fmt.Errorf("decode backend Docker networks: %w", err) }
	for _, network := range networks {
		if network.NetworkID == "" { continue }
		ipamJSON, err := commandOutput("docker", "network", "inspect", "--format", "{{json .IPAM.Config}}", network.NetworkID)
		if err != nil { return "", err }
		var configs []struct{ Subnet string `json:"Subnet"` }
		if err := json.Unmarshal([]byte(strings.TrimSpace(ipamJSON)), &configs); err != nil { return "", fmt.Errorf("decode Docker network IPAM: %w", err) }
		for _, config := range configs { if config.Subnet != "" { return config.Subnet, nil } }
	}
	return "", errors.New("Docker backend network has no IPv4 subnet")
}

func repositoryRoot() (string, error) {
	root, err := os.Getwd()
	if err != nil { return "", err }
	if _, statErr := os.Stat(filepath.Join(root, "deployment", "docker-compose.yml")); statErr == nil { return root, nil }
	parent := filepath.Dir(root)
	if _, statErr := os.Stat(filepath.Join(parent, "deployment", "docker-compose.yml")); statErr == nil { return parent, nil }
	return "", fmt.Errorf("could not locate repository deployment directory from %s", root)
}

func containsDependency(values []system.Dependency, name string) bool { for _, value := range values { if value.Name == name { return true } }; return false }
func unique(values []string) []string { result := []string{}; seen := map[string]bool{}; for _, value := range values { if !seen[value] { result = append(result, value); seen[value] = true } }; return result }
func stageError(stage string, err error) error { return fmt.Errorf("installation failed at %s: %w; logs: run cybernexus logs", stage, err) }

func readPassword() ([]byte, error) {
	if !term.IsTerminal(int(os.Stdin.Fd())) { return nil, errors.New("password input requires an interactive terminal") }
	return term.ReadPassword(int(os.Stdin.Fd()))
}

func readLine(prompt string) string { fmt.Print(prompt); var value string; fmt.Scanln(&value); return strings.TrimSpace(value) }
func askYesNo(prompt string, fallback bool) bool { value := strings.ToLower(readLine(prompt)); if value == "" { return fallback }; return value == "y" || value == "yes" }

