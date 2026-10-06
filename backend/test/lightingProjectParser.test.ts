import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { analyzeLightingProject, analyzeTextItems } from '../src/projects/LightingProjectParser.ts';

// A real client's CAD export. The repo is public, so the file is gitignored and
// lives only on the developer's machine; these suites skip without it.
const FIXTURE = 'test/fixtures/projeto-luminotecnico.pdf';
const noFixture = existsSync(FIXTURE) ? false : 'fixture PDF ausente (não versionado)';

describe('analyzeLightingProject — real ZWCAD export', { skip: noFixture }, async () => {
  const result = await analyzeLightingProject(new Uint8Array(readFileSync(FIXTURE)));
  const line = (code: string) => result.lines.find((l) => l.code === code);

  test('finds the summary table and both views of the plan', () => {
    assert.equal(result.hasSummaryTable, true);
    assert.equal(result.views, 2);
    assert.equal(result.lines.length, 23);
  });

  test('counts each code once per view, not once per occurrence on the sheet', () => {
    assert.equal(line('LT-1')?.counted, 5);
    assert.equal(line('LS-1')?.counted, 2);
    assert.equal(line('LA-1')?.counted, 1);
  });

  test('plan count matches the declared quantity everywhere', () => {
    assert.deepEqual(result.lines.filter((l) => l.divergent).map((l) => l.code), []);
    assert.equal(result.total, 28);
  });

  test('reads ambiente and description from the table row', () => {
    assert.equal(line('LT-1')?.ambiente, 'MESAS DE TRABALHO');
    assert.match(line('LT-1')?.description ?? '', /^Perfil 1,20m para fita de de LED pendente/);
    assert.equal(line('LS-1')?.ambiente, 'ESCRITÓRIOS');
  });
});

describe('analyzeTextItems', () => {
  const tableRow = (code: string, qty: number, y: number) => [
    { str: code, x: 100, y, page: 1 },
    { str: String(qty), x: 170, y, page: 1 },
  ];

  test('flags a divergence between plan and table', () => {
    const items = [
      ...tableRow('LA-1', 3, 300), ...tableRow('LB-1', 1, 260), ...tableRow('LC-1', 1, 220),
      { str: 'LA-1', x: 800, y: 500, page: 1 },
      { str: 'LA-1', x: 820, y: 400, page: 1 },
      { str: 'LB-1', x: 830, y: 450, page: 1 },
      { str: 'LC-1', x: 840, y: 420, page: 1 },
    ];
    const result = analyzeTextItems(items);
    const la = result.lines.find((l) => l.code === 'LA-1');
    assert.equal(la?.counted, 2);
    assert.equal(la?.declared, 3);
    assert.equal(la?.divergent, true);
    assert.equal(result.total, 5);
  });

  test('without a table, counts the plan tags', () => {
    const items = ['LT-1', 'LT-1', 'LS-2'].map((str, i) => ({ str, x: 500 + i * 30, y: 100, page: 1 }));
    const result = analyzeTextItems(items);
    assert.equal(result.hasSummaryTable, false);
    assert.equal(result.total, 3);
  });

  test('a PDF without text is reported unreadable', () => {
    assert.equal(analyzeTextItems([]).readable, false);
  });
});

describe('isLightingProject', async () => {
  process.env.DOTENV_CONFIG_PATH = 'test/.env.never-loaded';
  const { isLightingProject } = await import('../src/projects/LightingProjectService.ts');
  const real = noFixture ? null : await analyzeLightingProject(new Uint8Array(readFileSync(FIXTURE)));
  const a4WithCodes = {
    ...analyzeTextItems(['LA-1', 'LB-2', 'LA-1'].map((str, i) => ({ str, x: 100 + i * 200, y: 100, page: 1 }))),
    pages: 1,
    largeFormat: false,
  };

  test('the real CAD sheet is a project', { skip: noFixture }, () => {
    assert.equal(real!.largeFormat, true);
    assert.equal(isLightingProject(real!), true);
  });

  test('an A4 page with stray code-like strings and no summary table is not (boleto, nota fiscal)', () => {
    assert.equal(isLightingProject(a4WithCodes), false);
  });

  test('an unreadable PDF is not', () => {
    assert.equal(isLightingProject({ ...analyzeTextItems([]), pages: 1, largeFormat: true }), false);
  });
});
