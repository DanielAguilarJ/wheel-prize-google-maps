import { describe, expect, it } from 'vitest';
import {
  buildPlayRecord,
  createPlayId,
  isValidContact,
  isValidEmail,
  isValidMexicanPhone,
  redeemMessage,
  safeGoogleReviewUrl,
  sanitizeText,
  validateLead,
  whatsappLink,
} from './lead';
import type { Prize } from './types';

const rules = { requireLead: true, requireConsent: true };

const prize: Prize = {
  id: 'diagnostico',
  label: 'Diagnóstico gratis',
  icon: '🧠',
  weight: 10,
  kind: 'diagnostico',
  detail: 'detalle',
  enabled: true,
};

describe('sanitizeText', () => {
  it('colapsa espacios y recorta', () => {
    expect(sanitizeText('  Ana   María  ')).toBe('Ana María');
  });

  it('respeta el límite de longitud', () => {
    expect(sanitizeText('a'.repeat(200), 10)).toHaveLength(10);
  });
});

describe('isValidMexicanPhone', () => {
  it('acepta 10 dígitos y variantes con lada', () => {
    expect(isValidMexicanPhone('5512345678')).toBe(true);
    expect(isValidMexicanPhone('55 1234 5678')).toBe(true);
    expect(isValidMexicanPhone('+52 55 1234 5678')).toBe(true);
    expect(isValidMexicanPhone('+521 55 1234 5678')).toBe(true);
  });

  it('rechaza longitudes inválidas', () => {
    expect(isValidMexicanPhone('123')).toBe(false);
    expect(isValidMexicanPhone('')).toBe(false);
    expect(isValidMexicanPhone('123456789012345')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('acepta correos normales', () => {
    expect(isValidEmail('ana@example.com')).toBe(true);
    expect(isValidEmail('ana.perez+wb@sub.dominio.mx')).toBe(true);
  });

  it('rechaza formatos incompletos', () => {
    expect(isValidEmail('ana@')).toBe(false);
    expect(isValidEmail('ana@dominio')).toBe(false);
    expect(isValidEmail('ana example@dominio.com')).toBe(false);
  });
});

describe('isValidContact', () => {
  it('acepta email o teléfono', () => {
    expect(isValidContact('ana@example.com')).toBe(true);
    expect(isValidContact('5512345678')).toBe(true);
    expect(isValidContact('no-soy-contacto')).toBe(false);
  });
});

describe('validateLead', () => {
  const validLead = {
    name: 'Ana',
    contact: 'ana@example.com',
    programId: 'fotolectura',
    audience: 'jovenes-adultos',
    source: 'directo',
    consent: true,
  };

  it('acepta un lead completo', () => {
    expect(validateLead(validLead, rules)).toEqual({ valid: true, errors: {} });
  });

  it('exige nombre, contacto y programa', () => {
    const result = validateLead({ ...validLead, name: 'A', contact: 'x', programId: '' }, rules);
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['contact', 'name', 'programId']);
  });

  it('exige consentimiento cuando la regla está activa', () => {
    expect(validateLead({ ...validLead, consent: false }, rules).errors.consent).toBeDefined();
  });

  it('permite jugar sin datos si las reglas lo permiten (modo discreto)', () => {
    const result = validateLead(
      { name: '', contact: '', programId: '', audience: '', consent: false },
      { requireLead: false, requireConsent: false },
    );
    expect(result.valid).toBe(true);
  });
});

describe('createPlayId', () => {
  it('empieza con p y la marca de tiempo', () => {
    const id = createPlayId(new Date('2026-03-01T10:20:30.000Z'), () => 0);
    expect(id.startsWith('p20260301102030')).toBe(true);
  });
});

describe('buildPlayRecord', () => {
  it('crea un registro consistente y sin datos residuales', () => {
    const record = buildPlayRecord({
      prize,
      lead: {
        name: '  Ana   Pérez ',
        contact: ' ana@example.com ',
        programId: 'fotolectura',
        audience: 'jovenes-adultos',
        source: 'directo',
        consent: true,
      },
      now: new Date('2026-03-01T10:20:30.000Z'),
      randomFn: () => 0,
    });

    expect(record.prizeId).toBe('diagnostico');
    expect(record.prizeLabel).toBe('Diagnóstico gratis');
    expect(record.name).toBe('Ana Pérez');
    expect(record.contact).toBe('ana@example.com');
    expect(record.code).toBe('WB-AAAA-AAAA');
    expect(record.at).toBe('2026-03-01T10:20:30.000Z');
    expect(record.rating).toBeNull();
    expect(record.reviewOpened).toBe(false);
    expect(record.redeemed).toBe(false);
  });

  it('usa "directo" como origen por defecto y respeta el origen del QR', () => {
    const base = {
      prize,
      now: new Date('2026-03-01T10:20:30.000Z'),
      randomFn: () => 0,
    };
    const lead = {
      name: 'Ana',
      contact: 'ana@example.com',
      programId: 'fotolectura',
      audience: 'jovenes-adultos',
      consent: true,
    };
    expect(buildPlayRecord({ ...base, lead }).source).toBe('directo');
    expect(buildPlayRecord({ ...base, lead: { ...lead, source: 'feria-izcalli' } }).source).toBe(
      'feria-izcalli',
    );
  });
});

describe('whatsappLink', () => {
  it('limpia el teléfono y codifica el mensaje', () => {
    expect(whatsappLink('+52 55 1234 5678', 'hola mundo & más')).toBe(
      'https://wa.me/525512345678?text=hola%20mundo%20%26%20m%C3%A1s',
    );
  });
});

describe('redeemMessage', () => {
  it('incluye premio, código y programa', () => {
    const message = redeemMessage(
      {
        id: 'p1',
        at: '2026-03-01T10:00:00.000Z',
        prizeId: 'diagnostico',
        prizeLabel: 'Diagnóstico gratis',
        code: 'WB-AAAA-BBBB',
        name: 'Ana',
        contact: 'ana@example.com',
        programId: 'fotolectura',
        audience: 'jovenes-adultos',
        source: 'directo',
        consent: true,
        rating: 5,
        feedback: '',
        reviewOpened: true,
        redeemed: false,
      },
      'WorldBrain México',
    );
    expect(message).toContain('Diagnóstico gratis');
    expect(message).toContain('WB-AAAA-BBBB');
    expect(message).toContain('fotolectura');
  });
});

describe('safeGoogleReviewUrl', () => {
  it('acepta dominios de Google por https', () => {
    expect(safeGoogleReviewUrl('https://search.google.com/local/writereview?placeid=abc')).toContain(
      'search.google.com',
    );
    expect(safeGoogleReviewUrl('https://g.page/r/abc/review')).toContain('g.page');
    expect(safeGoogleReviewUrl('https://maps.app.goo.gl/abc')).toContain('maps.app.goo.gl');
    expect(safeGoogleReviewUrl('https://www.google.com.mx/maps')).toContain('google.com.mx');
  });

  it('rechaza otros dominios y http', () => {
    expect(safeGoogleReviewUrl('https://sitio-malicioso.com/review')).toBeNull();
    expect(safeGoogleReviewUrl('http://search.google.com/local/writereview')).toBeNull();
    expect(safeGoogleReviewUrl('javascript:alert(1)')).toBeNull();
    expect(safeGoogleReviewUrl('no-es-una-url')).toBeNull();
  });

  it('rechaza dominios que sólo imitan a Google', () => {
    expect(safeGoogleReviewUrl('https://google.com.evil.net/review')).toBeNull();
  });
});
