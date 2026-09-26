package main

import (
	"os"
	"strings"
	"testing"

	"github.com/risknexus/cli/internal/config"
)

func TestEnsureGeminiAPIKeyRequiresTTYForNonInteractive(t *testing.T) {
	reader, writer, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	originalStdin := os.Stdin
	os.Stdin = reader
	defer func() { os.Stdin = originalStdin; writer.Close(); reader.Close() }()

	value := &config.MySQLConfig{}
	err = ensureGeminiAPIKey(value)
	if err == nil || !strings.Contains(err.Error(), "non-interactive execution") {
		t.Fatalf("expected non-interactive Gemini error, got %v", err)
	}
}
