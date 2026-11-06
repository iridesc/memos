// Package skills embeds the agent skills that ship with this repository so a
// running instance can hand them out over HTTP.
package skills

import (
	"archive/zip"
	"embed"
	"io"
	"io/fs"
	"path"
	"time"

	"github.com/pkg/errors"
)

// MemodoSkillName is the directory name of the memodo skill.
const MemodoSkillName = "memodo"

//go:embed memodo
var embedded embed.FS

// zipEpoch keeps the archive byte-identical between builds: without a fixed
// timestamp every build would produce a different checksum.
var zipEpoch = time.Date(1980, 1, 1, 0, 0, 0, 0, time.UTC)

// MemodoFS returns the memodo skill as a filesystem rooted at the skill
// directory, so paths inside it look like "SKILL.md" or "references/mcp-tools.md".
func MemodoFS() fs.FS {
	sub, err := fs.Sub(embedded, MemodoSkillName)
	if err != nil {
		// The directory is embedded at compile time; this can only fail if the
		// embed directive and MemodoSkillName drift apart.
		panic(errors.Wrap(err, "failed to open embedded memodo skill"))
	}
	return sub
}

// WriteMemodoZip writes the memodo skill directory as a zip archive.
//
// Entries keep the skill directory as their top-level folder, so extracting the
// archive into a skills directory yields <skills-dir>/memodo/SKILL.md without
// any extra renaming.
func WriteMemodoZip(w io.Writer) error {
	root := MemodoFS()
	zw := zip.NewWriter(w)

	walkErr := fs.WalkDir(root, ".", func(name string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		data, err := fs.ReadFile(root, name)
		if err != nil {
			return err
		}
		header := &zip.FileHeader{
			Name:     path.Join(MemodoSkillName, name),
			Method:   zip.Deflate,
			Modified: zipEpoch,
		}
		header.SetMode(0o644)
		writer, err := zw.CreateHeader(header)
		if err != nil {
			return err
		}
		_, err = writer.Write(data)
		return err
	})
	if walkErr != nil {
		_ = zw.Close()
		return errors.Wrap(walkErr, "failed to pack skill files")
	}
	return errors.Wrap(zw.Close(), "failed to finalize skill archive")
}
