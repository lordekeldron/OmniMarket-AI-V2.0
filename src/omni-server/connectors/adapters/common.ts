import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { Snapshot, SnapshotGroup } from '../../../omni/types/connectors';
import { ReauthorizationRequiredError, type McpToolClient, type ToolResult } from '../mcp';

export interface AdapterContext {
  client: McpToolClient;
  period: { from: string; to: string };
  now: Date;
}

export type AdapterOutput = Pick<Snapshot, 'groups' | 'notices'>;
export type Adapter = (ctx: AdapterContext) => Promise<AdapterOutput>;

export function newGroup(id: string, label: string, sublabel?: string): SnapshotGroup {
  return { id, label, ...(sublabel ? { sublabel } : {}), kpis: [], series: [], breakdowns: [], tables: [], notices: [] };
}

export function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function lastDays(now: Date, days: number): { from: string; to: string } {
  const to = new Date(now);
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: ymd(from), to: ymd(to) };
}

/** ISO 8601 com deslocamento explícito, como o Metricool pede. */
export function isoWithOffset(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

export function snippet(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export type SafeCall = { ok: true; result: ToolResult } | { ok: false; error: string };

/**
 * Chama uma ferramenta sem derrubar a sincronização inteira: falhas viram
 * `{ ok: false }` para o adaptador registrar um aviso e seguir. Perda de
 * autorização é a exceção — ela sobe, porque muda o estado da conexão.
 */
export async function callSafe(client: McpToolClient, name: string, args: Record<string, unknown> = {}): Promise<SafeCall> {
  try {
    const result = await client.callTool(name, args);
    if (result.isError) return { ok: false, error: snippet(result.text || `A ferramenta ${name} retornou erro.`, 240) };
    return { ok: true, result };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ReauthorizationRequiredError) throw err;
    return { ok: false, error: snippet(err instanceof Error ? err.message : String(err), 240) };
  }
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function safeDivide(a: number, b: number): number | undefined {
  return b > 0 ? a / b : undefined;
}
