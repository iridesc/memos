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

func TestServeSkillFiles(t *testing.T) {
	e := newTestServer(t)

	t.Run("skill entrypoint", func(t *testing.T) {
		resp := doRequest(t, e, "GET", "/skills/memodo/SKILL.md")
		defer resp.Body.Close()
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.Contains(t, resp.Header.Get("Content-Type"), "text/markdown")

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		require.Contains(t, string(body), "name: memodo")
	})

	t.Run("reference file", func(t *testing.T) {
		resp := doRequest(t, e, "GET", "/skills/memodo/references/mcp-tools.md")
		defer resp.Body.Close()
		require.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("script file", func(t *testing.T) {
		resp := doRequest(t, e, "GET", "/skills/memodo/scripts/audit_tags.py")
		defer resp.Body.Close()
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.Contains(t, resp.Header.Get("Content-Type"), "text/x-python")
	})

	t.Run("directory redirects to SKILL.md", func(t *testing.T) {
		resp := doRequest(t, e, "GET", "/skills/memodo")
		defer resp.Body.Close()
		require.Equal(t, http.StatusMovedPermanently, resp.StatusCode)
		require.Equal(t, "/skills/memodo/SKILL.md", resp.Header.Get("Location"))
	})
}

func TestServeSkillFilesRejectsTraversal(t *testing.T) {
	e := newTestServer(t)

	for _, target := range []string{
		"/skills/memodo/../../server/server.go",
		"/skills/memodo/%2e%2e/%2e%2e/go.mod",
	} {
		resp := doRequest(t, e, "GET", target)
		defer resp.Body.Close()
		require.NotEqual(t, http.StatusOK, resp.StatusCode, "target %q must not be served", target)
	}
}

func TestServeSkillFileNotFound(t *testing.T) {
	e := newTestServer(t)
	resp := doRequest(t, e, "GET", "/skills/memodo/nope.md")
	defer resp.Body.Close()
	require.Equal(t, http.StatusNotFound, resp.StatusCode)
}

func TestCleanSkillPath(t *testing.T) {
	cases := map[string]string{
		"SKILL.md":                     "SKILL.md",
		"/SKILL.md":                    "SKILL.md",
		"references/tag-audit.md":      "references/tag-audit.md",
		"./references/tag-audit.md":    "references/tag-audit.md",
		"references/../SKILL.md":       "SKILL.md",
		"references//tag-audit.md":     "references/tag-audit.md",
		"scripts/audit_tags.py":        "scripts/audit_tags.py",
		"references/mcp-tools.md/":     "references/mcp-tools.md",
		"references/./tag-audit.md/..": "references",
		"..":                           "",
		"../..":                        "",
	}
	for input, want := range cases {
		got, err := cleanSkillPath(input)
		if want == "" {
			require.Error(t, err, "input %q should be rejected", input)
			continue
		}
		require.NoError(t, err, "input %q", input)
		require.Equal(t, want, got, "input %q", input)
	}
}
