package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/cybernexus/cli/internal/config"
	mysqlcheck "github.com/cybernexus/cli/internal/mysql"
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
	case "configure", "install": err = configure()
	case "status": err = status()
	case "start": err = compose("up", "-d")
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
	root, err := os.Getwd()
	if err != nil { return err }
	composeFile := filepath.Join(root, "deployment", "docker-compose.yml")
	if _, err := os.Stat(composeFile); err != nil {
		root = filepath.Dir(root)
		composeFile = filepath.Join(root, "deployment", "docker-compose.yml")
	}
	if _, err := os.Stat(composeFile); err != nil { return fmt.Errorf("deployment compose file is unavailable at %s: %w", composeFile, err) }
	return runCommand(root, "docker", append([]string{"compose", "-f", composeFile}, args...)...)
}

func currentDirectory() string { value, err := os.Getwd(); if err != nil { return "<unknown>" }; return value }

func runCommand(dir, name string, args ...string) error {
	fmt.Printf("→ Running: %s %s\n", name, strings.Join(args, " "))
	command := exec.Command(name, args...)
	command.Dir = dir
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	err := command.Run()
	if err == nil { return nil }
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) { return fmt.Errorf("command failed with exit code %d: %w", exitErr.ExitCode(), err) }
	return fmt.Errorf("could not execute command: %w", err)
}

func readPassword() ([]byte, error) {
	if !term.IsTerminal(int(os.Stdin.Fd())) { return nil, errors.New("password input requires an interactive terminal") }
	return term.ReadPassword(int(os.Stdin.Fd()))
}

func readLine(prompt string) string { fmt.Print(prompt); var value string; fmt.Scanln(&value); return strings.TrimSpace(value) }
func askYesNo(prompt string, fallback bool) bool { value := strings.ToLower(readLine(prompt)); if value == "" { return fallback }; return value == "y" || value == "yes" }

