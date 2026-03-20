export const SETTINGS_STORAGE_KEY = "klobasovnik-shared-settings";

export const DEFAULT_SHARED_SETTINGS = {
  appPassword: "",
  gistId: "",
  githubToken: "",
  gistFilename: "inventory.json",
};

export function hasCompleteSharedSettings(settings) {
  if (!settings || typeof settings !== "object") {
    return false;
  }

  return Boolean(
    String(settings.appPassword ?? "").trim() &&
      String(settings.gistId ?? "").trim() &&
      String(settings.githubToken ?? "").trim() &&
      String(settings.gistFilename ?? "").trim(),
  );
}