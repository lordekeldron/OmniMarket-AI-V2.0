// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { findRecords, findTimeSeries, parseCompact, parseToolPayload, pickNumber, toIsoDate, toNumber } from './parse';

// Trecho da resposta real de data_source_discovery (compress: true) do Supermetrics.
const SUPERMETRICS_COMPACT = `sources[3]:
  - id: AA
    name: Amazon Ads
    description: A platform for advertising on Amazon's websites and mobile apps.
    categories[1]: Paid media
    authentication_status: NOT_AUTHENTICATED
  - id: AW
    name: Google Ads
    description: "A platform for advertising on Google search, websites, and apps."
    categories[2]: Paid media,Search
    authentication_status: AUTHENTICATED
    data_out: true
    most_popular: true
  - id: APPD
    name: Apple Public Data
    categories[2]: Brand Reputation,Mobile
    authentication_status: NOT_REQUIRED
notes[2]: first note,"second, with comma"
business_context:
  note: "No business context is saved for this team yet."`;

test('parseCompact lê a lista de fontes do Supermetrics', () => {
  const parsed = parseCompact(SUPERMETRICS_COMPACT) as any;
  assert.equal(parsed.sources.length, 3);
  assert.equal(parsed.sources[0].id, 'AA');
  assert.equal(parsed.sources[1].authentication_status, 'AUTHENTICATED');
  assert.equal(parsed.sources[1].data_out, true);
  assert.deepEqual(parsed.sources[1].categories, ['Paid media', 'Search']);
  assert.equal(parsed.sources[1].description, 'A platform for advertising on Google search, websites, and apps.');
  assert.deepEqual(parsed.notes, ['first note', 'second, with comma']);
  assert.equal(parsed.business_context.note, 'No business context is saved for this team yet.');
});

test('parseCompact lê tabelas com cabeçalho de campos', () => {
  const parsed = parseCompact(`rows[3]{date,clicks,cost}:
  2026-11-01,10,12.5
  2026-11-02,14,"9,80"
  2026-11-03,0,0`) as any;
  assert.equal(parsed.rows.length, 3);
  assert.deepEqual(parsed.rows[0], { date: '2026-11-01', clicks: 10, cost: 12.5 });
  assert.equal(parsed.rows[1].cost, '9,80');
});

test('parseToolPayload aceita JSON, envelope, bloco de código e texto com JSON embutido', () => {
  assert.deepEqual(parseToolPayload('{"a":1}'), { a: 1 });
  assert.deepEqual(parseToolPayload('{"success":true,"data":{"a":1}}'), { a: 1 });
  assert.deepEqual(parseToolPayload('{"success":true,"data":"{\\"a\\":2}"}'), { a: 2 });
  assert.deepEqual(parseToolPayload('```json\n[1,2]\n```'), [1, 2]);
  assert.deepEqual(parseToolPayload('Projects (1):\n[{"id":"p1","domain":"x.com"}]'), [{ id: 'p1', domain: 'x.com' }]);
});

test('parseToolPayload abre o envelope cujo data está no formato compacto', () => {
  const wrapped = JSON.stringify({ success: true, data: SUPERMETRICS_COMPACT, metadata: { tool_version: '1' } });
  const parsed = parseToolPayload(wrapped) as any;
  assert.equal(parsed.sources[1].name, 'Google Ads');
});

test('parseToolPayload devolve undefined para texto livre e para a resposta vazia do OpenSEO', () => {
  assert.equal(parseToolPayload(''), undefined);
  assert.equal(parseToolPayload('Hello there, nothing structured here.'), undefined);
  // Resposta real do OpenSEO sem projetos: texto, sem JSON.
  assert.equal(
    parseToolPayload('Projects (0):\nNo projects yet. Ask the user for their website, then call create_project with its domain.'),
    undefined,
  );
});

test('toNumber entende formatos brasileiros e americanos', () => {
  assert.equal(toNumber(12), 12);
  assert.equal(toNumber('12,5%'), 12.5);
  assert.equal(toNumber('R$ 1.234,56'), 1234.56);
  assert.equal(toNumber('1,234.50'), 1234.5);
  assert.equal(toNumber('1,234'), 1234);
  assert.equal(toNumber('abc'), undefined);
  assert.equal(toNumber(NaN), undefined);
});

test('toIsoDate normaliza formatos de data', () => {
  assert.equal(toIsoDate('2026-11-01'), '2026-11-01');
  assert.equal(toIsoDate('20261101'), '2026-11-01');
  assert.equal(toIsoDate('2026-11-01 10:00:00'), '2026-11-01T10:00:00');
  assert.equal(toIsoDate('amanhã'), undefined);
  assert.equal(toIsoDate(12), undefined);
});

test('findTimeSeries encontra séries por chave de data e no formato do Search Console', () => {
  const generic = findTimeSeries({
    data: [
      { date: '2026-11-02', followers: 12, reach: 5 },
      { date: '2026-11-01', followers: 10, reach: 3 },
    ],
  });
  const followers = generic.find((s) => s.label === 'followers');
  assert.deepEqual(followers?.points, [
    { date: '2026-11-01', value: 10 },
    { date: '2026-11-02', value: 12 },
  ]);

  const gsc = findTimeSeries({
    rows: [
      { keys: ['2026-11-01'], clicks: 4, impressions: 100, ctr: 0.04, position: 8.2 },
      { keys: ['2026-11-02'], clicks: 6, impressions: 120, ctr: 0.05, position: 7.9 },
    ],
  });
  assert.equal(gsc.find((s) => s.label === 'clicks')?.points.length, 2);
  assert.equal(findTimeSeries({ rows: [{ label: 'a', n: 1 }] }).length, 0);
});

test('findRecords e pickNumber localizam registros e valores por apelidos', () => {
  const records = findRecords({ result: { campaigns: [{ name: 'A', Spend: '10,5', clicks: 3 }, { name: 'B', Spend: 2, clicks: 1 }] } });
  assert.equal(records.length, 2);
  assert.equal(pickNumber(records[0] ?? {}, ['cost', 'spend']), 10.5);
  assert.equal(pickNumber(records[0] ?? {}, ['impressions']), undefined);
});
