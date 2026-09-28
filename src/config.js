const DEFAULT_API_BASE = "https://api.audryo.com/v1";

export const normalizeApiBase = (value) => {
  const trimmed = String(value ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_API_BASE;
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
};

export const readConfig = ({ flags = {}, env = process.env } = {}) => {
  const apiKey = flags.apiKey ?? env.AUDRYO_API_KEY ?? "";
  const projectId = flags.projectId ?? flags.project ?? env.AUDRYO_PROJECT_ID ?? "";

  return {
    apiBase: normalizeApiBase(flags.apiBase ?? env.AUDRYO_API_BASE),
    apiKey: String(apiKey).trim(),
    projectId: String(projectId).trim(),
  };
};

export const requireApiKey = (config) => {
  if (config.apiKey) return config;
  throw new ConfigError(
    "Set AUDRYO_API_KEY or pass --api-key. Create a workspace token at Settings → Developer.",
  );
};

export const requireProjectId = (config, explicitId) => {
  const projectId = String(explicitId ?? config.projectId ?? "").trim();
  if (projectId) return projectId;
  throw new ConfigError(
    "Set AUDRYO_PROJECT_ID or pass --project-id. GET /bootstrap lists the projects this token can see.",
  );
};

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
    this.code = "config_error";
  }
}
