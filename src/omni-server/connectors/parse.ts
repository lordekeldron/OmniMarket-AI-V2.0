/**
 * Leitura tolerante das respostas dos servidores MCP.
 *
 * Os servidores devolvem texto. Às vezes é JSON, às vezes JSON dentro de um
 * envelope {success, data}, às vezes texto com JSON embutido, e o Supermetrics
 * devolve um formato compacto (tipo TOON) quando `compress` está ligado.
 * Nenhum desses formatos foi confirmado contra contas reais com dados, então
 * este módulo aceita todos e os adaptadores sinalizam quando nada é reconhecido.
 */

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Converte a resposta de texto de uma ferramenta em dados estruturados, se possível. */
export function parseToolPayload(text: string): Json | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const direct = tryJson(trimmed);
  if (direct !== undefined) return unwrapEnvelope(direct);

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    const inner = tryJson(fenced[1] ?? '');
    if (inner !== undefined) return unwrapEnvelope(inner);
  }

  const compact = parseCompact(trimmed);
  if (compact !== undefined) return unwrapEnvelope(compact);

  const embedded = extractEmbeddedJson(trimmed);
  if (embedded !== undefined) return unwrapEnvelope(embedded);

  return undefined;
}

/** Abre envelopes comuns: {success, data}, {result}, {data: "<json em texto>"}. */
export function unwrapEnvelope(value: Json): Json {
  let current: Json = value;
  for (let depth = 0; depth < 3; depth++) {
    if (!isObject(current)) return current;

    const keys = Object.keys(current);
    const looksLikeEnvelope =
      ('success' in current || 'ok' in current || 'status' in current || 'result' in current) &&
      ('data' in current || 'result' in current || 'content' in current);
    if (!looksLikeEnvelope && !(keys.length <= 2 && ('data' in current || 'result' in current))) return current;

    const inner = 'data' in current ? current['data'] : 'result' in current ? current['result'] : current['content'];
    if (typeof inner === 'string') {
      const parsed = parseToolPayload(inner);
      if (parsed === undefined) return current;
      current = parsed;
    } else if (inner !== undefined) {
      current = inner;
    } else {
      return current;
    }
  }
  return current;
}

function tryJson(text: string): Json | undefined {
  try {
    return JSON.parse(text) as Json;
  } catch {
    return undefined;
  }
}

/** Procura o primeiro objeto ou lista JSON balanceado dentro de um texto maior. */
function extractEmbeddedJson(text: string): Json | undefined {
  for (let start = 0; start < text.length; start++) {
    const open = text[start];
    if (open !== '{' && open !== '[') continue;
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (ch === '\\') i++;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          const candidate = tryJson(text.slice(start, i + 1));
          // Ignora marcadores como "[3]" em texto comum: só vale objeto não vazio
          // ou lista que contenha objetos.
          const informative =
            isObject(candidate) ? Object.keys(candidate).length > 0 : Array.isArray(candidate) && candidate.some((x) => typeof x === 'object' && x !== null);
          if (candidate !== undefined && informative) return candidate as Json;
          break;
        }
      }
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Formato compacto (subconjunto do TOON), como o devolvido pelo Supermetrics.
//
//   sources[2]:
//     - id: AA
//       name: Amazon Ads
//     - id: AW
//       name: Google Ads
//   rows[2]{date,clicks}:
//     2026-11-01,10
//     2026-11-02,14
//   notes[2]: a,b
// ---------------------------------------------------------------------------

function lineAt(lines: Line[], i: number): Line {
  const line = lines[i];
  if (!line) throw new Error('Fim inesperado do texto compacto.');
  return line;
}

interface Line {
  indent: number;
  text: string;
}

const KEY_LINE = /^((?:"(?:[^"\\]|\\.)*")|[^\s:\[\]{}"-][^:\[\]{}]*?)(?:\[(\d+)\])?(?:\{([^}]*)\})?:(?:\s+(.*))?$/;

export function parseCompact(text: string): Json | undefined {
  const lines: Line[] = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((l) => ({ indent: l.length - l.trimStart().length, text: l.trim() }));

  if (lines.length === 0 || !lines.some((l) => KEY_LINE.test(l.text) && !l.text.startsWith('- '))) return undefined;

  const pos = { i: 0 };
  try {
    const result = parseBlock(lines, pos, lineAt(lines, 0).indent);
    if (pos.i < lines.length) return undefined;
    // Uma frase comum com dois-pontos ("Erro: algo") não é dado estruturado:
    // exige marcador de lista [N] ou ao menos duas chaves no topo.
    const hasListMarker = lines.some((l) => /^[^:]*\[\d+\][^:]*:/.test(l.text));
    return Object.keys(result).length >= 2 || hasListMarker ? result : undefined;
  } catch {
    return undefined;
  }
}

function parseBlock(lines: Line[], pos: { i: number }, indent: number): JsonObject {
  const obj: JsonObject = {};
  while (pos.i < lines.length && lineAt(lines, pos.i).indent === indent && !lineAt(lines, pos.i).text.startsWith('- ')) {
    const line = lineAt(lines, pos.i);
    const m = line.text.match(KEY_LINE);
    if (!m) throw new Error(`Linha não reconhecida: ${line.text}`);
    const key = unquote(m[1] ?? '');
    const count = m[2] !== undefined ? Number(m[2]) : undefined;
    const fields = m[3] !== undefined ? splitCsv(m[3]) : undefined;
    const inline = m[4];
    pos.i++;

    if (fields && count !== undefined) {
      const rows: Json[] = [];
      while (pos.i < lines.length && lineAt(lines, pos.i).indent > indent && rows.length < count) {
        const values = splitCsv(lineAt(lines, pos.i).text).map(scalar);
        const row: JsonObject = {};
        fields.forEach((f, idx) => (row[f] = values[idx] ?? null));
        rows.push(row);
        pos.i++;
      }
      obj[key] = rows;
    } else if (count !== undefined) {
      if (inline !== undefined && inline !== '') {
        obj[key] = splitCsv(inline).map(scalar);
      } else if (pos.i < lines.length && lineAt(lines, pos.i).indent > indent && lineAt(lines, pos.i).text.startsWith('- ')) {
        obj[key] = parseList(lines, pos, lineAt(lines, pos.i).indent);
      } else {
        obj[key] = [];
      }
    } else if (inline !== undefined && inline !== '') {
      obj[key] = scalar(inline);
    } else if (pos.i < lines.length && lineAt(lines, pos.i).indent > indent) {
      obj[key] = parseBlock(lines, pos, lineAt(lines, pos.i).indent);
    } else {
      obj[key] = null;
    }
  }
  return obj;
}

function parseList(lines: Line[], pos: { i: number }, indent: number): Json[] {
  const items: Json[] = [];
  while (pos.i < lines.length && lineAt(lines, pos.i).indent === indent && lineAt(lines, pos.i).text.startsWith('- ')) {
    const first = lineAt(lines, pos.i).text.slice(2).trim();
    const itemIndent = indent + 2;
    const m = first.match(KEY_LINE);
    if (m) {
      // o primeiro campo do objeto está na própria linha do "- "
      lines[pos.i] = { indent: itemIndent, text: first };
      items.push(parseBlock(lines, pos, itemIndent));
    } else {
      items.push(scalar(first));
      pos.i++;
    }
  }
  return items;
}

function splitCsv(text: string): string[] {
  const out: string[] = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      current += ch;
      if (ch === '\\') current += text[++i] ?? '';
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      current += ch;
    } else if (ch === ',') {
      out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v) as string;
    } catch {
      return v.slice(1, -1);
    }
  }
  return v;
}

function scalar(value: string): Json {
  const v = value.trim();
  if (v === 'null' || v === '') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v.startsWith('"')) return unquote(v);
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v) && !/^0\d/.test(v)) return Number(v);
  return v;
}

// ---------------------------------------------------------------------------
// Utilidades para localizar dados em estruturas desconhecidas
// ---------------------------------------------------------------------------

/** Número a partir de number ou texto ("12,5%", "R$ 1.234,56", "1,234.50"). */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  let s = value.trim().replace(/[^\d.,\-eE+]/g, '');
  if (!s || !/\d/.test(s)) return undefined;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = /,\d{3}$/.test(s) && s.indexOf(',') === lastComma ? s.replace(',', '') : s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const DATE_KEYS = /^(date|day|dt|time|timestamp|datetime|period|week|month|published_?at|created_?at)$/i;

/** Normaliza datas em ISO, YYYYMMDD ou epoch (s/ms). Devolve undefined se não parecer data. */
export function toIsoDate(value: unknown): string | undefined {
  if (typeof value === 'number') {
    if (value > 1e12) return new Date(value).toISOString();
    if (value > 1e9) return new Date(value * 1000).toISOString();
    if (/^\d{8}$/.test(String(value))) return toIsoDate(String(value));
    return undefined;
  }
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(v)) return v.replace(' ', 'T');
  return undefined;
}

/** A maior lista de objetos encontrada em qualquer profundidade. */
export function findRecords(value: unknown, minKeys = 2): JsonObject[] {
  let best: JsonObject[] = [];
  const visit = (node: Json | undefined, depth: number) => {
    if (node === undefined || node === null || depth > 6) return;
    if (Array.isArray(node)) {
      const objects = node.filter(isObject) as JsonObject[];
      if (objects.length > 0 && objects.length === node.length && Object.keys(objects[0] ?? {}).length >= minKeys && objects.length > best.length) {
        best = objects;
      }
      node.forEach((n) => visit(n, depth + 1));
    } else if (isObject(node)) {
      Object.values(node).forEach((n) => visit(n, depth + 1));
    }
  };
  visit(value as Json | undefined, 0);
  return best;
}

export interface FoundSeries {
  label: string;
  points: { date: string; value: number }[];
}

/**
 * Procura séries temporais em estruturas desconhecidas: listas de objetos com
 * uma chave de data e uma ou mais chaves numéricas, ou o formato do Search
 * Console ({ keys: ["2026-11-01"], clicks, impressions }).
 */
export function findTimeSeries(value: unknown): FoundSeries[] {
  const found = new Map<string, FoundSeries>();

  const addPoint = (label: string, date: string, v: number) => {
    const series = found.get(label) ?? { label, points: [] };
    series.points.push({ date, value: v });
    found.set(label, series);
  };

  const visit = (node: Json | undefined, depth: number) => {
    if (node === undefined || node === null || depth > 6) return;
    if (Array.isArray(node)) {
      const objects = node.filter(isObject) as JsonObject[];
      if (objects.length >= 2 && objects.length === node.length) {
        const first = objects[0] as JsonObject;
        const firstKeys = first['keys'];
        const dateKey = Object.keys(first).find((k) => DATE_KEYS.test(k) && toIsoDate(first[k]));
        const keysDate = Array.isArray(firstKeys) ? toIsoDate(firstKeys[0]) : undefined;
        if (dateKey || keysDate) {
          for (const row of objects) {
            const rowKeys = row['keys'];
            const date = dateKey ? toIsoDate(row[dateKey]) : Array.isArray(rowKeys) ? toIsoDate(rowKeys[0]) : undefined;
            if (!date) continue;
            for (const [k, v] of Object.entries(row)) {
              if (k === dateKey || k === 'keys') continue;
              const n = toNumber(v);
              if (n !== undefined && typeof v !== 'object') addPoint(k, date, n);
            }
          }
        }
      }
      node.forEach((n) => visit(n, depth + 1));
    } else if (isObject(node)) {
      Object.values(node).forEach((n) => visit(n, depth + 1));
    }
  };
  visit(value as Json | undefined, 0);

  return [...found.values()]
    .filter((s) => s.points.length >= 2)
    .map((s) => ({ ...s, points: s.points.sort((a, b) => a.date.localeCompare(b.date)) }));
}

/** Primeiro valor numérico entre chaves candidatas (sem diferenciar maiúsculas, ignora _ e -). */
export function pickNumber(record: JsonObject, candidates: string[]): number | undefined {
  const normalized = new Map(Object.keys(record).map((k) => [k.toLowerCase().replace(/[_\-\s]/g, ''), k]));
  for (const candidate of candidates) {
    const key = normalized.get(candidate.toLowerCase().replace(/[_\-\s]/g, ''));
    if (key !== undefined) {
      const n = toNumber(record[key]);
      if (n !== undefined) return n;
    }
  }
  return undefined;
}

export function pickString(record: JsonObject, candidates: string[]): string | undefined {
  const normalized = new Map(Object.keys(record).map((k) => [k.toLowerCase().replace(/[_\-\s]/g, ''), k]));
  for (const candidate of candidates) {
    const key = normalized.get(candidate.toLowerCase().replace(/[_\-\s]/g, ''));
    if (key !== undefined) {
      const v = record[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (typeof v === 'number') return String(v);
    }
  }
  return undefined;
}
