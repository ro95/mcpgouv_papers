import { Entreprise } from '../../domain/entreprise.entity';

function makeEntreprise(dateCreation: string, etat: 'A' | 'C' = 'A'): Entreprise {
  return new Entreprise(
    '123456789',
    'TEST SAS',
    dateCreation,
    '62.01Z',
    'Programmation informatique',
    'PME',
    etat,
    {
      siret: '12345678900011',
      codePostal: '75001',
      libelleCommune: 'PARIS',
      departement: '75',
      region: '11',
      adresse: '1 RUE DE LA PAIX',
    },
    1,
    1,
    null,
    null,
  );
}

describe('Entreprise (entity)', () => {
  describe('estActive', () => {
    it('retourne true pour etatAdministratif A', () => {
      expect(makeEntreprise('2024-01-01', 'A').estActive).toBe(true);
    });

    it('retourne false pour etatAdministratif C', () => {
      expect(makeEntreprise('2024-01-01', 'C').estActive).toBe(false);
    });
  });

  describe('dateCreationISO', () => {
    it('convertit la date string en objet Date', () => {
      const e = makeEntreprise('2024-06-15');
      const d = e.dateCreationISO;
      expect(d).toBeInstanceOf(Date);
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(5); // 0-indexed
      expect(d.getDate()).toBe(15);
    });
  });

  describe('ancienneteJours', () => {
    it('retourne 0 pour une entreprise créée aujourd\'hui', () => {
      const today = new Date().toISOString().split('T')[0];
      const e = makeEntreprise(today);
      expect(e.ancienneteJours).toBe(0);
    });

    it('retourne ~1 pour une entreprise créée hier', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const e = makeEntreprise(yesterday.toISOString().split('T')[0]);
      expect(e.ancienneteJours).toBeGreaterThanOrEqual(1);
      expect(e.ancienneteJours).toBeLessThanOrEqual(2);
    });

    it('retourne ~365 pour une entreprise créée il y a un an', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const e = makeEntreprise(oneYearAgo.toISOString().split('T')[0]);
      expect(e.ancienneteJours).toBeGreaterThanOrEqual(364);
      expect(e.ancienneteJours).toBeLessThanOrEqual(367);
    });
  });
});
