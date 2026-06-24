import { create } from "@bufbuild/protobuf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateAutoArchiveSetting, useUpdateUserGeneralSetting } from "@/hooks/useUserQueries";
import { Visibility } from "@/types/proto/api/v1/memo_service_pb";
import {
  UserSetting_AutoArchiveSettingSchema,
  UserSetting_GeneralSetting,
  UserSetting_GeneralSettingSchema,
} from "@/types/proto/api/v1/user_service_pb";
import { loadLocale, useTranslate } from "@/utils/i18n";
import { convertVisibilityFromString, convertVisibilityToString } from "@/utils/memo";
import { loadTheme } from "@/utils/theme";
import LocaleSelect from "../LocaleSelect";
import ThemeSelect from "../ThemeSelect";
import { Input } from "../ui/input";
import VisibilityIcon from "../VisibilityIcon";
import SettingGroup from "./SettingGroup";
import { SettingList, SettingListItem } from "./SettingList";
import SettingSection from "./SettingSection";

const PreferencesSection = () => {
  const t = useTranslate();
  const { currentUser, userGeneralSetting: generalSetting, userAutoArchiveSetting: autoArchiveSetting, refetchSettings } = useAuth();
  const { mutate: updateUserGeneralSetting } = useUpdateUserGeneralSetting(currentUser?.name);
  const { mutate: updateAutoArchiveSetting } = useUpdateAutoArchiveSetting(currentUser?.name);

  const handleLocaleSelectChange = (locale: Locale) => {
    // Apply locale immediately for instant UI feedback and persist to localStorage
    loadLocale(locale);
    // Persist to user settings
    updateUserGeneralSetting(
      { generalSetting: { locale }, updateMask: ["locale"] },
      {
        onSuccess: () => {
          refetchSettings();
        },
      },
    );
  };

  const handleDefaultMemoVisibilityChanged = (value: string) => {
    updateUserGeneralSetting(
      { generalSetting: { memoVisibility: value }, updateMask: ["memo_visibility"] },
      {
        onSuccess: () => {
          refetchSettings();
        },
      },
    );
  };

  const handleThemeChange = (theme: string) => {
    // Apply theme immediately for instant UI feedback
    loadTheme(theme);
    // Persist to user settings
    updateUserGeneralSetting(
      { generalSetting: { theme }, updateMask: ["theme"] },
      {
        onSuccess: () => {
          refetchSettings();
        },
      },
    );
  };

  const handleAutoArchiveEnabledChange = (enabled: boolean) => {
    updateAutoArchiveSetting(
      { autoArchiveSetting: { enabled }, updateMask: ["enabled"] },
      {
        onSuccess: () => {
          refetchSettings();
        },
      },
    );
  };

  const handleArchiveAfterDaysChange = (value: string) => {
    const days = parseInt(value, 10);
    if (isNaN(days) || days < 1) {
      return;
    }
    const clampedDays = Math.min(Math.max(days, 1), 365);
    updateAutoArchiveSetting(
      { autoArchiveSetting: { archiveAfterDays: clampedDays }, updateMask: ["archive_after_days"] },
      {
        onSuccess: () => {
          refetchSettings();
        },
      },
    );
  };

  // Provide default values if setting is not loaded yet
  const setting: UserSetting_GeneralSetting =
    generalSetting ||
    create(UserSetting_GeneralSettingSchema, {
      locale: "en",
      memoVisibility: "PRIVATE",
      theme: "system",
    });

  const autoArchive =
    autoArchiveSetting ||
    create(UserSetting_AutoArchiveSettingSchema, {
      enabled: false,
      archiveAfterDays: 15,
    });

  return (
    <SettingSection title={t("setting.preference.label")}>
      <SettingGroup title={t("setting.preference.appearance-title")} description={t("setting.preference.appearance-description")}>
        <SettingList>
          <SettingListItem label={t("common.language")} description={t("setting.preference.language-description")}>
            <LocaleSelect value={setting.locale} onChange={handleLocaleSelectChange} />
          </SettingListItem>

          <SettingListItem label={t("setting.preference.theme")} description={t("setting.preference.theme-description")}>
            <ThemeSelect value={setting.theme} onValueChange={handleThemeChange} />
          </SettingListItem>
        </SettingList>
      </SettingGroup>

      <SettingGroup
        title={t("setting.preference.memo-defaults-title")}
        description={t("setting.preference.memo-defaults-description")}
        showSeparator
      >
        <SettingList>
          <SettingListItem
            label={t("setting.preference.default-memo-visibility")}
            description={t("setting.preference.default-memo-visibility-description")}
          >
            <Select value={setting.memoVisibility || "PRIVATE"} onValueChange={handleDefaultMemoVisibilityChanged}>
              <SelectTrigger className="min-w-fit">
                <div className="flex items-center gap-2">
                  <VisibilityIcon visibility={convertVisibilityFromString(setting.memoVisibility)} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {[Visibility.PRIVATE, Visibility.PROTECTED, Visibility.PUBLIC]
                  .map((v) => convertVisibilityToString(v))
                  .map((item) => (
                    <SelectItem key={item} value={item} className="whitespace-nowrap">
                      {t(`memo.visibility.${item.toLowerCase() as Lowercase<typeof item>}`)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </SettingListItem>
        </SettingList>
      </SettingGroup>

      <SettingGroup
        title={t("setting.preference.auto-archive-title")}
        description={t("setting.preference.auto-archive-description")}
        showSeparator
      >
        <SettingList>
          <SettingListItem
            label={t("setting.preference.auto-archive-enabled")}
            description={t("setting.preference.auto-archive-enabled-description")}
          >
            <Switch checked={autoArchive.enabled} onCheckedChange={handleAutoArchiveEnabledChange} />
          </SettingListItem>
          <SettingListItem
            label={t("setting.preference.auto-archive-days")}
            description={t("setting.preference.auto-archive-days-description")}
          >
            <Input
              type="number"
              min={1}
              max={365}
              value={autoArchive.archiveAfterDays}
              onChange={(e) => handleArchiveAfterDaysChange(e.target.value)}
              className="w-24"
              disabled={!autoArchive.enabled}
            />
          </SettingListItem>
        </SettingList>
      </SettingGroup>
    </SettingSection>
  );
};

export default PreferencesSection;
