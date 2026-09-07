/**
 * Returns the first non-empty Decoration Text line from a print's saved config.
 * Invalid and legacy snapshots without dialTextBlock intentionally return null.
 */
export function getPrintDecorationFirstLine(configJson?: string): string | null {
  if (!configJson) return null;

  try {
    const config: unknown = JSON.parse(configJson);
    if (!config || typeof config !== 'object' || Array.isArray(config)) return null;

    const dialTextBlock = (config as Record<string, unknown>).dialTextBlock;
    if (typeof dialTextBlock !== 'string') return null;

    return dialTextBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? null;
  } catch {
    return null;
  }
}
