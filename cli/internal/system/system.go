package system

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

type Info struct {
	OS           string
	Distribution string
	Version      string
	Architecture string
	User         string
	Elevated     bool
	RAMGB        string
	DiskGB       string
}

type Dependency struct {
	Name    string
	Command string
	Args    []string
	Package string
	Required string
}

func Detect() (Info, error) {
	if runtime.GOOS != "linux" || runtime.GOARCH != "amd64" {
		return Info{}, fmt.Errorf("unsupported system: %s/%s; supported system is Ubuntu 26.04 amd64", runtime.GOOS, runtime.GOARCH)
	}
	info := Info{OS: runtime.GOOS, Architecture: runtime.GOARCH, User: os.Getenv("USER"), Elevated: elevated()}
	if !info.Elevated { return info, fmt.Errorf("start must run with elevated privileges; use sudo ./cybernexus start") }
	info.Distribution, info.Version = readOSRelease()
	if info.Distribution != "Ubuntu" { return info, fmt.Errorf("unsupported distribution %q; supported distribution is Ubuntu 26.04", info.Distribution) }
	if info.Version != "26.04" { return info, fmt.Errorf("unsupported Ubuntu version %q; supported version is Ubuntu 26.04", info.Version) }
	info.RAMGB = readRAM()
	info.DiskGB = readDisk()
	return info, nil
}

func elevated() bool {
	command := exec.Command("id", "-u")
	output, err := command.Output()
	return err == nil && strings.TrimSpace(string(output)) == "0"
}

func Dependencies() []Dependency {
	return []Dependency{
		{Name: "curl", Command: "curl", Args: []string{"--version"}, Package: "curl", Required: "installed"},
		{Name: "wget", Command: "wget", Args: []string{"--version"}, Package: "wget", Required: "installed"},
		{Name: "tar", Command: "tar", Args: []string{"--version"}, Package: "tar", Required: "installed"},
		{Name: "Apache", Command: "apache2", Args: []string{"-v"}, Package: "apache2", Required: ">= 2.4"},
		{Name: "PHP", Command: "php", Args: []string{"-v"}, Package: "php", Required: ">= 8.1"},
		{Name: "PHP MySQL extension", Command: "php", Args: []string{"-m"}, Package: "php-mysql", Required: "enabled"},
		{Name: "MySQL client", Command: "mysql", Args: []string{"--version"}, Package: "mysql-client", Required: "installed"},
		{Name: "Docker", Command: "docker", Args: []string{"--version"}, Package: "docker.io", Required: "installed"},
		{Name: "Docker Compose", Command: "docker", Args: []string{"compose", "version"}, Package: "docker-compose-plugin", Required: ">= 2"},
		{Name: "GLPI Agent", Command: "glpi-agent", Args: []string{"--version"}, Package: "glpi-agent", Required: "installed"},
	}
}

func Missing(dependencies []Dependency) []Dependency {
	missing := []Dependency{}
	for _, dependency := range dependencies {
		if _, err := exec.LookPath(dependency.Command); err != nil { missing = append(missing, dependency); continue }
		if dependency.Name == "PHP MySQL extension" {
			output, err := exec.Command(dependency.Command, dependency.Args...).CombinedOutput()
			if err != nil || (!strings.Contains(string(output), "mysqli") && !strings.Contains(string(output), "pdo_mysql")) { missing = append(missing, dependency) }
			continue
		}
		if err := exec.Command(dependency.Command, dependency.Args...).Run(); err != nil { missing = append(missing, dependency) }
	}
	return missing
}

func readOSRelease() (string, string) {
	data, err := os.ReadFile("/etc/os-release")
	if err != nil { return "unknown", "unknown" }
	values := map[string]string{}
	for _, line := range strings.Split(string(data), "\n") {
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 { values[parts[0]] = strings.Trim(parts[1], "\"") }
	}
	return values["NAME"], values["VERSION_ID"]
}

func readRAM() string {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil { return "unknown" }
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "MemTotal:") {
			parts := strings.Fields(line)
			if len(parts) >= 2 { kb, _ := strconv.ParseInt(parts[1], 10, 64); return fmt.Sprintf("%.1f GB", float64(kb)/1024/1024) }
		}
	}
	return "unknown"
}

func readDisk() string {
	command := exec.Command("df", "-BG", "/")
	output, err := command.Output()
	if err != nil { return "unknown" }
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(lines) < 2 { return "unknown" }
	parts := strings.Fields(lines[len(lines)-1])
	if len(parts) >= 4 { return strings.TrimSuffix(parts[3], "G") + " GB" }
	return "unknown"
}
