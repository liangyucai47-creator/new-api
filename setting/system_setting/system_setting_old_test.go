package system_setting

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResolveServerAddress_Default(t *testing.T) {
	require.Equal(t, defaultServerAddress, resolveServerAddress(""))
	require.Equal(t, defaultServerAddress, resolveServerAddress("   "))
}

func TestResolveServerAddress_NormalizesEnvValue(t *testing.T) {
	require.Equal(t, "http://127.0.0.1:5041", resolveServerAddress(" http://127.0.0.1:5041/ "))
}

func TestLoadFromEnv_UsesServerAddressEnv(t *testing.T) {
	original := ServerAddress
	t.Cleanup(func() {
		ServerAddress = original
	})

	t.Setenv("SERVER_ADDRESS", "http://127.0.0.1:5041/")

	LoadFromEnv()

	require.Equal(t, "http://127.0.0.1:5041", ServerAddress)
}
