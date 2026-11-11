/**
 * Settings > API access, as pure functions: the personal access token view model, the create
 * form's rules, and the connection snippets for MCP clients and curl.
 *
 * Tokens live in identity-tenant-service (`/api/v1/api-tokens`). The server keeps only a hash
 * and the last four characters; the token text exists once, in the create response, and this
 * module never stores it anywhere. Pure so it can be tested without a server.
 */

export type TokenScope = "read" | "read_write";
export type TokenState = "active" | "expired" | "revoked";

/** One token as the list shows it (identity's `ApiToken`, kept structural). */
export interface ApiTokenRow {
  id: string;
  name: string;
  scope: TokenScope;
  state: TokenState;
  token_preview: string;
  created_at: string;
  expires_at: string;
  revoked_at?: string | null;
  last_used_at?: string | null;
}

export const SCOPE_LABEL: Record<TokenScope, string> = {
  read: "Read only",
  read_write: "Read and write",
};

export const SCOPE_HELP: Record<TokenScope, string> = {
  read: "Search, ask, and read meetings, decisions and your tasks.",
  read_write: "Also create tasks and confirm or edit as you. Use only for tools you trust.",
};

/** Expiry choices, in days. Every token expires; 365 is the server's maximum. */
export const EXPIRY_OPTIONS: readonly { days: number; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
];
export const DEFAULT_EXPIRY_DAYS = 90;
export const MAX_ACTIVE_TOKENS = 20;
export const MAX_NAME = 80;

export type TokenInput = { name: string; scope: TokenScope; expiresInDays: number };

/** The create form's check, the same rules the server enforces (1 to 80 characters, a known
 *  scope, 1 to 365 days). Returns the field and message for the first problem, or null. */
export function validateTokenInput(input: { name: string; scope: string; expiresInDays: number }): { field: "name" | "scope" | "expiry"; message: string } | null {
  const name = input.name.trim();
  if (!name) return { field: "name", message: "Name the token after the tool that will use it." };
  if (name.length > MAX_NAME) return { field: "name", message: `Keep the name under ${MAX_NAME} characters.` };
  if (input.scope !== "read" && input.scope !== "read_write") return { field: "scope", message: "Choose what the token may do." };
  if (!Number.isInteger(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > 365) {
    return { field: "expiry", message: "Choose when the token expires." };
  }
  return null;
}

/** Active first (newest first), then expired and revoked (newest first). */
export function sortTokens<T extends ApiTokenRow>(rows: readonly T[]): T[] {
  const rank = (t: ApiTokenRow) => (t.state === "active" ? 0 : 1);
  return [...rows].sort((a, b) => rank(a) - rank(b) || Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function activeCount(rows: readonly ApiTokenRow[]): number {
  return rows.filter((t) => t.state === "active").length;
}

/** The token chip: tone and words. An active token that expires within 7 days says so. */
export function tokenStatus(t: ApiTokenRow, now: Date): { tone: "ok" | "medium" | "outline"; label: string } {
  if (t.state === "revoked") return { tone: "outline", label: "Revoked" };
  if (t.state === "expired") return { tone: "outline", label: "Expired" };
  const days = Math.ceil((Date.parse(t.expires_at) - now.getTime()) / 86_400_000);
  if (Number.isFinite(days) && days <= 7) return { tone: "medium", label: days <= 1 ? "Expires today" : `Expires in ${days} days` };
  return { tone: "ok", label: "Active" };
}

/** The public API's origin for snippets: the gateway URL when it is https, else production. */
export function apiOrigin(raw: string | undefined | null): string {
  const fallback = "https://api.mytheus.cloud";
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.origin : fallback;
  } catch {
    return fallback;
  }
}

export type Snippet = { id: string; title: string; description: string; language: "json" | "shell"; code: string };

/** The copyable setups. The token itself never appears: each snippet reads it from
 *  `MYTHEUS_TOKEN` (or asks you to paste it), so a snippet can be shared or committed safely. */
export function connectionSnippets(origin: string): Snippet[] {
  const mcp = `${origin}/mcp`;
  return [
    {
      id: "claude-code",
      title: "Claude Code",
      description: "Run once in a terminal. Claude Code then has the Mytheus tools in every session.",
      language: "shell",
      code: `claude mcp add --transport http mytheus ${mcp} \\\n  --header "Authorization: Bearer $MYTHEUS_TOKEN"`,
    },
    {
      id: "claude-desktop",
      title: "Other MCP clients",
      description: "For a client configured with a JSON file, such as Cursor or an older Claude Desktop. Paste your token and restart the client.",
      language: "json",
      code: [
        "{",
        '  "mcpServers": {',
        '    "mytheus": {',
        '      "command": "npx",',
        `      "args": ["-y", "mcp-remote", "${mcp}",`,
        '               "--header", "Authorization: Bearer ${MYTHEUS_TOKEN}"],',
        '      "env": { "MYTHEUS_TOKEN": "paste your token here" }',
        "    }",
        "  }",
        "}",
      ].join("\n"),
    },
    {
      id: "curl-search",
      title: "Search with curl",
      description: "Meetings, decisions and actions that match the words you give.",
      language: "shell",
      code: `curl -s "${origin}/api/v1/search?q=pricing" \\\n  -H "Authorization: Bearer $MYTHEUS_TOKEN"`,
    },
    {
      id: "curl-ask",
      title: "Ask with curl",
      description: "A question answered from your meetings, with the passages it used.",
      language: "shell",
      code: `curl -s -X POST "${origin}/api/v1/ask" \\\n  -H "Authorization: Bearer $MYTHEUS_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"question": "What did we decide about pricing?"}'`,
    },
  ];
}
