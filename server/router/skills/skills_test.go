package skills

import (
	"archive/zip"
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v5"
	"github.com/stretchr/testify/require"
)

func newTestServer(t *testing.T) *echo.Echo {
	t.Helper()
	e := echo.New()
	NewService().RegisterRoutes(e)
	return e
}

func doRequest(t *testing.T, e *echo.Echo, method, target string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, target, nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec.Result()
}

func TestServeZip(t *testing.T) {
	e := newTestServer(t)
	resp := doRequest(t, e, "GET", "/skills/memodo.zip")
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)
	require.Equal(t, "application/zip", resp.Header.Get("Content-Type"))
	require.Contains(t, resp.Header.Get("Content-Disposition"), ZipFileName)

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	reader, err := zip.NewReader(bytes.NewReader(body), int64(len(body)))
	require.NoError(t, err)

	names := make([]string, 0, len(reader.File))
	for _, file := range reader.File {
		names = append(names, file.Name)
	}
	// The archive must keep the skill directory as its root so it can be
	// extracted straight into a skills directory.
	require.Contains(t, names, "memodo/SKILL.md")
	require.Contains(t, names, "memodo/references/mcp-tools.md")
	require.Contains(t, names, "memodo/references/tag-audit.md")
	require.Contains(t, names, "memodo/scripts/audit_tags.py")
	for _, name := range names {
		require.NotContains(t, name, "..")
	}
}

func TestServeZipIsDeterministic(t *testing.T) {
	e := newTestServer(t)

	first := doRequest(t, e, "GET", "/skills/memodo.zip")
	defer first.Body.Close()
	second := doRequest(t, e, "GET", "/skills/memodo.zip")
	defer second.Body.Close()

	firstBody, err := io.ReadAll(first.Body)
	require.NoError(t, err)
	secondBody, err := io.ReadAll(second.Body)
	require.NoError(t, err)

	// Fixed timestamps keep the archive stable; without them every request
	// would emit a different checksum.
	require.Equal(t, firstBody, secondBody)
}

func TestOnlyTheArchiveIsServed(t *testing.T) {
	e := newTestServer(t)

	// The skill ships as a directory, so the archive is the only download:
	// single files and the old directory redirect are gone.
	for _, target := range []string{
		"/skills/memodo",
		"/skills/memodo/SKILL.md",
		"/skills/memodo/references/mcp-tools.md",
		"/skills/memodo/scripts/audit_tags.py",
		"/skills/memodo/nope.md",
		"/skills/memodo/../../server/server.go",
		"/skills/memodo/%2e%2e/%2e%2e/go.mod",
	} {
		resp := doRequest(t, e, "GET", target)
		defer resp.Body.Close()
		require.Equal(t, http.StatusNotFound, resp.StatusCode, "target %q must not be served", target)
	}
}
