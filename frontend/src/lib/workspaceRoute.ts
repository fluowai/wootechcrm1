const DEFAULT_PANEL_HOSTS = ["nexus360.consultio.com.br", "www.nexus360.consultio.com.br"];

function configuredPanelHosts() {
  const rawUrl = import.meta.env.VITE_PANEL_URL || "";
  if (!rawUrl) return DEFAULT_PANEL_HOSTS;

  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return [...DEFAULT_PANEL_HOSTS, host, `www.${host}`];
  } catch {
    return DEFAULT_PANEL_HOSTS;
  }
}

export function isCustomWorkspaceHost() {
  const host = window.location.hostname.toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1") return false;
  return !configuredPanelHosts().includes(host);
}

export function workspacePath(basePath: string, slug?: string | null) {
  if (basePath.startsWith("/admin")) return basePath;
  if (isCustomWorkspaceHost()) return basePath;
  if (slug) return `/${slug}${basePath}`;
  return basePath;
}
