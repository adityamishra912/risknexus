package mysql

import "testing"

func TestMysqlHostPatternFromDockerSubnet(t *testing.T) {
	tests := []struct {
		subnet  string
		expect  string
	}{
		{"172.19.0.0/16", "172.19.%"},
		{"10.42.7.0/24", "10.42.7.%"},
	}
	for _, test := range tests {
		actual, err := mysqlHostPattern(test.subnet)
		if err != nil {
			t.Fatalf("mysqlHostPattern(%q): %v", test.subnet, err)
		}
		if actual != test.expect {
			t.Errorf("mysqlHostPattern(%q) = %q, want %q", test.subnet, actual, test.expect)
		}
	}
}

func TestMysqlHostPatternRejectsNonIPv4(t *testing.T) {
	if _, err := mysqlHostPattern("fd00::/64"); err == nil {
		t.Fatal("expected IPv6 subnet to be rejected")
	}
}
