package ui

import (
	"fmt"
	"os"
	"strings"

	"golang.org/x/term"
)

const reset = "\x1b[0m"

func Welcome() {
	printBanner([]string{
		"██╗    ██╗███████╗██╗      ██████╗ ██████╗ ███╗   ███╗███████╗",
		"██║    ██║██╔════╝██║     ██╔════╝██╔═══██╗████╗ ████║██╔════╝",
		"██║ █╗ ██║█████╗  ██║     ██║     ██║   ██║██╔████╔██║█████╗",
		"██║███╗██║██╔══╝  ██║     ██║     ██║   ██║██║╚██╔╝██║██╔══╝",
		"╚███╔███╔╝███████╗███████╗╚██████╗╚██████╔╝██║ ╚═╝ ██║███████╗",
		" ╚══╝╚══╝ ╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝",
	}, "WELCOME", "CYBER RISK QUANTIFICATION PLATFORM")
}

func Completion(dashboardURL, glpiURL, apiURL string) {
	printBanner([]string{
		"██████╗ ██╗███████╗██╗  ██╗███╗   ██╗███████╗██╗  ██╗███████╗",
		"██╔══██╗██║██╔════╝██║ ██╔╝████╗  ██║██╔════╝╚██╗██╔╝██╔════╝",
		"██████╔╝██║███████╗█████╔╝ ██╔██╗ ██║█████╗   ╚███╔╝ ███████╗",
		"██╔══██╗██║╚════██║██╔═██╗ ██║╚██╗██║██╔══╝   ██╔██╗ ╚════██║",
		"██║  ██║██║███████║██║  ██╗██║ ╚████║███████╗██╔╝ ██╗███████║",
		"╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚══════╝",
	}, "RISKNEXUS", "CYBER RISK QUANTIFICATION PLATFORM")

	width := terminalWidth()
	separator := strings.Repeat("─", min(width, 72))
	fmt.Println(color("36", separator))
	fmt.Printf("  Dashboard : %s\n  GLPI      : %s\n  API       : %s\n", dashboardURL, glpiURL, apiURL)
	fmt.Println(color("36", separator))
	fmt.Printf("\n%s\nPress Ctrl+C to stop.\n", color("1;32", "RiskNexus is running."))
}

func Step(message string)    { fmt.Println(color("1;36", "◆ "+message)) }
func Success(message string) { fmt.Println(color("32", "✓ "+message)) }
func Info(message string)    { fmt.Println(color("36", "→ "+message)) }
func Warning(message string) { fmt.Println(color("33", "⚠ "+message)) }
func Error(message string)   { fmt.Fprintln(os.Stderr, color("1;31", "✗ "+message)) }

func printBanner(lines []string, fallback, subtitle string) {
	width := terminalWidth()
	maxWidth := 0
	for _, line := range lines {
		if lineWidth := len([]rune(line)); lineWidth > maxWidth {
			maxWidth = lineWidth
		}
	}
	if maxWidth > width {
		lines = []string{fallback}
	}
	for _, line := range lines {
		fmt.Println(color("1;36", center(line, width)))
	}
	fmt.Printf("\n%s\n\n", color("1;34", center(subtitle, width)))
}

func terminalWidth() int {
	width, _, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil || width < 1 {
		return 80
	}
	return width
}

func center(value string, width int) string {
	padding := (width - len([]rune(value))) / 2
	if padding < 0 {
		padding = 0
	}
	return strings.Repeat(" ", padding) + value
}

func color(code, value string) string {
	if !term.IsTerminal(int(os.Stdout.Fd())) {
		return value
	}
	return "\x1b[" + code + "m" + value + reset
}
