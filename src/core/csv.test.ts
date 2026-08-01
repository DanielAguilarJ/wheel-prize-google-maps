import { describe, expect, it } from 'vitest';
import { csvFileName, escapeCsvField, playsToCsv, PLAY_CSV_HEADERS, playToRow } from './csv';
import type { PlayRecord } from './types';

function play(patch: Partial<PlayRecord> = {}): PlayRecord {
  return {
    id: 'p1',
    at: '2026-03-01T10:00:00.000Z',
    prizeId: 'diagnostico',
    prizeLabel: 'Diagnóstico gratis',
    code: 'WB-AAAA-BBBB',
    name: 'Ana Pérez',
    contact: 'ana@example.com',
    programId: 'fotolectura',
    audience: 'jovenes-adultos',
    source: 'directo',
    consent: true,
    rating: 5,
    feedback: '',
    reviewOpened: true,
    redeemed: false,
    ...patch,
  };
}

describe('escapeCsvField', () => {
  it('deja texto simple sin cambios', () => {
    expect(escapeCsvField('Ana')).toBe('Ana');
  });

  it('entrecomilla si hay coma, salto de línea o punto y coma', () => {
    expect(escapeCsvField('Pérez, Ana')).toBe('"Pérez, Ana"');
    expect(escapeCsvField('linea1\nlinea2')).toBe('"linea1\nlinea2"');
    expect(escapeCsvField('a;b')).toBe('"a;b"');
  });

  it('duplica las comillas internas', () => {
    expect(escapeCsvField('dijo "hola"')).toBe('"dijo ""hola"""');
  });

  it('neutraliza inyección de fórmulas de Excel', () => {
    expect(escapeCsvField('=1+1')).toBe("'=1+1");
    expect(escapeCsvField('+34600000000')).toBe("'+34600000000");
    expect(escapeCsvField('-2')).toBe("'-2");
    expect(escapeCsvField('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('convierte null y undefined en cadena vacía', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });
});

describe('playToRow', () => {
  it('genera una columna por encabezado', () => {
    expect(playToRow(play())).toHaveLength(PLAY_CSV_HEADERS.length);
  });

  it('traduce booleanos a si/no y rating nulo a vacío', () => {
    const row = playToRow(play({ consent: false, reviewOpened: false, redeemed: true, rating: null }));
    expect(row[11]).toBe('no');
    expect(row[12]).toBe('');
    expect(row[14]).toBe('no');
    expect(row[15]).toBe('si');
  });

  it('incluye el origen del QR', () => {
    expect(playToRow(play({ source: 'feria-izcalli' }))[10]).toBe('feria-izcalli');
  });
});

describe('playsToCsv', () => {
  it('incluye encabezados aunque no haya datos', () => {
    expect(playsToCsv([])).toBe(PLAY_CSV_HEADERS.join(','));
  });

  it('usa CRLF entre filas', () => {
    const csv = playsToCsv([play(), play({ id: 'p2' })]);
    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('escapa comentarios con comas', () => {
    const csv = playsToCsv([play({ feedback: 'Todo bien, pero tarde' })]);
    expect(csv).toContain('"Todo bien, pero tarde"');
  });
});

describe('csvFileName', () => {
  it('incluye la marca de tiempo y la extensión', () => {
    expect(csvFileName(new Date('2026-03-01T10:20:30.000Z'))).toBe(
      'ultragiro-jugadas-2026-03-01-10-20-30.csv',
    );
  });
});
