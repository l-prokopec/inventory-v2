export const SHARED_INVENTORY_CONFIG = {
  appPassword: "CHANGE_ME_PASSWORD",
  gistId: "CHANGE_ME_GIST_ID",
  githubToken: "CHANGE_ME_GITHUB_TOKEN",
  gistFilename: "inventory.json",
};

export function isSharedConfigReady() {
  const { appPassword, gistId, githubToken, gistFilename } = SHARED_INVENTORY_CONFIG;

  return (
    appPassword !== "CHANGE_ME_PASSWORD" &&
    gistId !== "CHANGE_ME_GIST_ID" &&
    githubToken !== "CHANGE_ME_GITHUB_TOKEN" &&
    Boolean(gistFilename)
  );
}