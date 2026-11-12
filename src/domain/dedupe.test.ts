import { describe, expect, it } from 'vitest';
import { isSameBook, normalizeTitle } from './dedupe';
import type { Book } from './types';

const b = (id: string, title: string, authors: string[] = [], isbn?: string): Book => ({
  id,
  title,
  authors,
  isbn,
  source: 'google',
});

describe('dedupe', () => {
  it('normalizes accents, articles and subtitles', () => {
    expect(normalizeTitle('El Señor de los Anillos: La Comunidad del Anillo')).toBe('senor de los anillos');
    expect(normalizeTitle('Rayuela (Edición conmemorativa)')).toBe('rayuela');
  });

  it('detects same book by id, isbn or title+author', () => {
    expect(isSameBook(b('1', 'X'), b('1', 'Y'))).toBe(true);
    expect(isSameBook(b('1', 'X', [], '978'), b('2', 'Y', [], '978'))).toBe(true);
    expect(isSameBook(b('1', 'Patria', ['Fernando Aramburu']), b('2', 'PATRIA', ['F. Aramburu']))).toBe(true);
  });

  it('does not merge different books with the same title by different authors', () => {
    expect(isSameBook(b('1', 'Nada', ['Carmen Laforet']), b('2', 'Nada', ['Janne Teller']))).toBe(false);
  });
});
