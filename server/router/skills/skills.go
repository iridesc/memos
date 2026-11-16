// Package skills serves the agent skills bundled into the binary so that MCP
// clients (and the humans configuring them) can fetch them from any instance.
package skills

import (
	"bytes"
	"net/http"

	"github.com/labstack/echo/v5"

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

	// Whole skill as an archive: the only download. The skill ships as a
	// directory (SKILL.md plus references/ and scripts/), so agents unpack it
	// into their skills folder; serving single files would duplicate the
	// archive without helping anyone.
	group.Match(methods, "/"+skillassets.MemodoSkillName+".zip", s.serveZip)
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
