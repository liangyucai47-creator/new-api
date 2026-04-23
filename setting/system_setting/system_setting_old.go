package system_setting

import (
	"os"
	"strings"
)

const defaultServerAddress = "http://localhost:3000"

var ServerAddress = defaultServerAddress
var WorkerUrl = ""
var WorkerValidKey = ""
var WorkerAllowHttpImageRequestEnabled = false

func LoadFromEnv() {
	ServerAddress = resolveServerAddress(os.Getenv("SERVER_ADDRESS"))
}

func resolveServerAddress(raw string) string {
	serverAddress := strings.TrimSpace(raw)
	if serverAddress == "" {
		return defaultServerAddress
	}
	return strings.TrimRight(serverAddress, "/")
}

func EnableWorker() bool {
	return WorkerUrl != ""
}
