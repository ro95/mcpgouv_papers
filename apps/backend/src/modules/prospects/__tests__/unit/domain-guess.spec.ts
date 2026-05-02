import { guessDomains, slugify } from '../../infrastructure/domain-guess';

describe('slugify', () => {
  it('strips only legal forms', () => {
    expect(slugify('Le Café de la Gare SAS')).toBe('le-cafe-de-la-gare');
  });

  it('handles accents and apostrophes', () => {
    expect(slugify("L'Atelier d'Émilie SARL")).toBe('l-atelier-d-emilie');
  });

  it('replaces & with et', () => {
    expect(slugify('Dupont & Fils SARL')).toBe('dupont-et-fils');
  });

  it('returns empty string when only legal forms', () => {
    expect(slugify('SAS SARL')).toBe('');
  });
});

describe('guessDomains', () => {
  it('proposes both .fr and .com, slug and compact', () => {
    const domains = guessDomains('Atelier Bois SAS');
    expect(domains).toEqual(
      expect.arrayContaining([
        'atelier-bois.fr',
        'atelierbois.fr',
        'atelier-bois.com',
        'atelierbois.com',
      ]),
    );
  });

  it('returns empty when name reduces to nothing', () => {
    expect(guessDomains('SAS')).toEqual([]);
  });
});
