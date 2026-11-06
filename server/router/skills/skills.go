// Package skills serves the agent skills bundled into the binary so that MCP
// clients (and the humans configuring them) can fetch them from any instance.
package skills

import (
	"bytes"
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/pkg/errors"

	skillassets "github.com/usememos/memodo/skills"
)

const (
	// ZipFileName is the name suggested to the downloading client.
	ZipFileName = "memodo-skill.zip"

	// The bundled skills only change on redeploy, so a short shared cache is
	// enough and keeps agents from re-downloading on every start.
	cacheControl = "public, max-age=300"
)

// Service exposes the embedded skills over HTTP.
type Service struct{}

// NewService returns a service that serves the embedded skills.
func NewService() *Service {
	return &Service{}
}

// RegisterRoutes mounts the skill download endpoints.
//
// These routes are intentionally public: skills contain no user data, and an
// agent typically needs them before it has been handed a personal token.
func (s *Service) RegisterRoutes(echoServer *echo.Echo) {
	group := echoServer.Group("/skills")

	// Download tools and agents often probe with HEAD before fetching, so
	// register it alongside GET. net/http drops the body for HEAD responses.
	methods := []string{http.MethodGet, http.MethodHead}

	// Whole skill as an archive: the primary download for agents.
	group.Match(methods, "/"+skillassets.MemodoSkillName+".zip", s.serveZip)
	// Single files, so a browser can open SKILL.md without unpacking anything.
	group.Match(methods, "/"+skillassets.MemodoSkillName, s.redirectToSkill)
	group.Match(methods, "/"+skillassets.MemodoSkillName+"/*", s.serveFile)
}

func (s *Service) serveZip(c *echo.Context) error {
	var buf bytes.Buffer
	if err := skillassets.WriteMemodoZip(&buf); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to build skill archive").Wrap(err)
	}
	c.Response().Header().Set("Content-Disposition", `attachment; filename="`+ZipFileName+`"`)
	c.Response().Header().Set("Cache-Control", cacheControl)
	return c.Blob(http.StatusOK, "application/zip", buf.Bytes())
}

func (s *Service) redirectToSkill(c *echo.Context) error {
	return c.Redirect(http.StatusMovedPermanently, "/skills/"+skillassets.MemodoSkillName+"/SKILL.md")
}

func (s *Service) serveFile(c *echo.Context) error {
	name, err := cleanSkillPath(c.Param("*"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid skill path").Wrap(err)
	}
	root := skillassets.MemodoFS()
	info, err := fs.Stat(root, name)
	if err != nil || info.IsDir() {
		return echo.NewHTTPError(http.StatusNotFound, "skill file not found")
	}
	data, err := fs.ReadFile(root, name)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to read skill file").Wrap(err)
	}
	c.Response().Header().Set("Cache-Control", cacheControl)
	return c.Blob(http.StatusOK, contentType(name), data)
}

// cleanSkillPath normalizes a URL wildcard into a path relative to the skill
// root and rejects anything that would escape it.
func cleanSkillPath(raw string) (string, error) {
	trimmed := strings.TrimPrefix(strings.TrimSpace(raw), "/")
	cleaned := path.Clean("/" + trimmed)
	if cleaned == "/" {
		return "", errors.New("empty skill path")
	}
	cleaned = strings.TrimPrefix(cleaned, "/")
	if cleaned == ".." || strings.HasPrefix(cleaned, "../") {
		return "", errors.New("skill path escapes the skill directory")
	}
	return cleaned, nil
}

// contentType maps a skill file to its media type. Everything is UTF-8 text
// except images, which the skill currently does not ship but may later.
func contentType(name string) string {
	switch strings.ToLower(path.Ext(name)) {
	case ".md", ".txt":
		return "text/markdown; charset=utf-8"
	case ".py":
		return "text/x-python; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".yaml", ".yml":
		return "text/yaml; charset=utf-8"
	case ".png":
		return "image/png"
	case ".svg":
		return "image/svg+xml"
	default:
		return "application/octet-stream"
	}
}
