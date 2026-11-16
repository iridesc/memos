import copy from "copy-to-clipboard";
import { CopyIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/utils/i18n";
import SettingGroup from "./SettingGroup";
import SettingRow from "./SettingRow";
import SettingSection from "./SettingSection";

// The skill archive is served by the instance itself, so the link stays
// relative and follows the deployment domain.
const SKILL_ARCHIVE_URL = "/skills/memodo.zip";

// Folders the common MCP clients scan for skills.
const SKILL_DIRECTORIES = ["~/.claude/skills/", "~/.agents/skills/", "~/.pi/agent/skills/"];

const CodeBlock = ({ value, onCopy }: { value: string; onCopy: () => void }) => {
  const t = useTranslate();
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 rounded-md border border-border bg-muted/30 p-2">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs leading-5 text-foreground">{value}</pre>
      <Button size="sm" variant="outline" className="w-fit" onClick={onCopy}>
        <CopyIcon className="mr-2 size-3.5" />
        {t("setting.integration.copy")}
      </Button>
    </div>
  );
};

const IntegrationSection = () => {
  const t = useTranslate();
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const endpoint = `${origin}/mcp`;
  const claudeCommand = `claude mcp add --scope user --transport http memodo ${endpoint} --header "Authorization: Bearer <PAT>"`;
  const jsonConfig = JSON.stringify(
    {
      mcpServers: {
        memodo: {
          url: endpoint,
          headers: { Authorization: "Bearer <PAT>" },
        },
      },
    },
    null,
    2,
  );

  const handleCopy = (value: string) => {
    copy(value);
    toast.success(t("setting.integration.copied"));
  };

  return (
    <SettingSection title={t("setting.integration.label")}>
      <SettingGroup title={t("setting.integration.agent-skill-title")} description={t("setting.integration.agent-skill-description")}>
        <SettingRow label={t("setting.integration.skill-download")} description={t("setting.integration.skill-download-hint")}>
          <Button asChild size="sm" variant="outline">
            <a href={SKILL_ARCHIVE_URL} download>
              <DownloadIcon className="mr-2 size-3.5" />
              {t("setting.integration.skill-download")}
            </a>
          </Button>
        </SettingRow>
        <SettingRow
          label={t("setting.integration.skill-install-title")}
          description={t("setting.integration.skill-install-description")}
          vertical
        >
          <div className="flex flex-wrap gap-2">
            {SKILL_DIRECTORIES.map((dir) => (
              <code key={dir} className="rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs text-foreground">
                {dir}
              </code>
            ))}
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("setting.integration.mcp-title")} description={t("setting.integration.mcp-description")} showSeparator>
        <SettingRow label={t("setting.integration.mcp-endpoint")} description={t("setting.integration.mcp-endpoint-hint")}>
          <Button size="sm" variant="outline" onClick={() => handleCopy(endpoint)}>
            <CopyIcon className="mr-2 size-3.5" />
            {t("setting.integration.copy")}
          </Button>
        </SettingRow>
        <SettingRow label={t("setting.integration.mcp-token")} description={t("setting.integration.mcp-token-description")}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.hash = "my-account";
            }}
          >
            {t("setting.integration.mcp-token-action")}
            <ExternalLinkIcon className="ml-2 size-3.5" />
          </Button>
        </SettingRow>
        <SettingRow label={t("setting.integration.mcp-config-claude")} vertical>
          <CodeBlock value={claudeCommand} onCopy={() => handleCopy(claudeCommand)} />
        </SettingRow>
        <SettingRow label={t("setting.integration.mcp-config-json")} vertical>
          <CodeBlock value={jsonConfig} onCopy={() => handleCopy(jsonConfig)} />
        </SettingRow>
      </SettingGroup>
    </SettingSection>
  );
};

export default IntegrationSection;
