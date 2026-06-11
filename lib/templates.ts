const TOKEN_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function extractTokens(content: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(content)) !== null) found.add(m[1]);
  return Array.from(found);
}

export function resolveTokens(content: string, values: Record<string, string>): string {
  return content.replace(TOKEN_RE, (_, key: string) => values[key] ?? `{{${key}}}`);
}
