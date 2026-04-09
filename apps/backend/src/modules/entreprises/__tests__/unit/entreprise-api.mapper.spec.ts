import { EntrepriseApiMapper } from '../../infrastructure/mappers/entreprise-api.mapper';
import { Entreprise } from '../../domain/entreprise.entity';
import type { RawEntreprise, RawSearchResponse } from '../../infrastructure/http-clients/recherche-entreprises.client';

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

const buildRawEntreprise = (overrides: Partial<RawEntreprise> = {}): RawEntreprise => ({
  siren: '123456789',
  nom_raison_sociale: 'ACME SAS',
  date_creation: '2024-03-01',
  activite_principale: '62.01Z',
  libelle_activite_principale: 'Programmation informatique',
  categorie_entreprise: 'PME',
  etat_administratif: 'A',
  siege: {
    siret: '12345678900011',
    code_postal: '75001',
    libelle_commune: 'PARIS',
    departement: '75',
    region: '11',
    adresse: '1 RUE DE LA PAIX',
    latitude: 48.8698,
    longitude: 2.3309,
  },
  nombre_etablissements: 2,
  nombre_etablissements_ouverts: 2,
  tranche_effectif_salarie: '11',
  date_immatriculation: '2024-03-05',
  ...overrides,
});

const buildRawSearchResponse = (
  results: RawEntreprise[],
  overrides: Partial<RawSearchResponse> = {},
): RawSearchResponse => ({
  results,
  total_results: results.length,
  page: 1,
  per_page: 20,
  total_pages: 1,
  ...overrides,
});

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe('EntrepriseApiMapper', () => {
  let mapper: EntrepriseApiMapper;

  beforeEach(() => {
    mapper = new EntrepriseApiMapper();
  });

  // ── toEntity ──────────────────────────────────

  describe('toEntity()', () => {
    it('mappe correctement les champs principaux', () => {
      const raw = buildRawEntreprise();
      const entity = mapper.toEntity(raw);

      expect(entity).toBeInstanceOf(Entreprise);
      expect(entity.siren).toBe('123456789');
      expect(entity.nomRaisonSociale).toBe('ACME SAS');
      expect(entity.dateCreation).toBe('2024-03-01');
      expect(entity.activitePrincipale).toBe('62.01Z');
      expect(entity.libelleActivitePrincipale).toBe('Programmation informatique');
      expect(entity.categorieEntreprise).toBe('PME');
      expect(entity.etatAdministratif).toBe('A');
      expect(entity.nombreEtablissements).toBe(2);
      expect(entity.nombreEtablissementsOuverts).toBe(2);
      expect(entity.trancheEffectifSalarie).toBe('11');
      expect(entity.dateImmatriculation).toBe('2024-03-05');
    });

    it('mappe correctement le siège social', () => {
      const raw = buildRawEntreprise();
      const entity = mapper.toEntity(raw);

      expect(entity.siege.siret).toBe('12345678900011');
      expect(entity.siege.codePostal).toBe('75001');
      expect(entity.siege.libelleCommune).toBe('PARIS');
      expect(entity.siege.departement).toBe('75');
      expect(entity.siege.region).toBe('11');
      expect(entity.siege.adresse).toBe('1 RUE DE LA PAIX');
      expect(entity.siege.latitude).toBe(48.8698);
      expect(entity.siege.longitude).toBe(2.3309);
    });

    it('gère les champs nullables', () => {
      const raw = buildRawEntreprise({
        categorie_entreprise: null,
        tranche_effectif_salarie: null,
        date_immatriculation: null,
      });
      const entity = mapper.toEntity(raw);

      expect(entity.categorieEntreprise).toBeNull();
      expect(entity.trancheEffectifSalarie).toBeNull();
      expect(entity.dateImmatriculation).toBeNull();
    });

    it('remplace les valeurs undefined par des chaînes vides', () => {
      const raw = buildRawEntreprise({
        nom_raison_sociale: undefined as unknown as string,
        activite_principale: undefined as unknown as string,
      });
      const entity = mapper.toEntity(raw);

      expect(entity.nomRaisonSociale).toBe('');
      expect(entity.activitePrincipale).toBe('');
    });

    it('calcule correctement estActive pour une entreprise active', () => {
      const entity = mapper.toEntity(buildRawEntreprise({ etat_administratif: 'A' }));
      expect(entity.estActive).toBe(true);
    });

    it('calcule correctement estActive pour une entreprise cessée', () => {
      const entity = mapper.toEntity(buildRawEntreprise({ etat_administratif: 'C' }));
      expect(entity.estActive).toBe(false);
    });

    it('calcule ancienneteJours de manière cohérente', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      const entity = mapper.toEntity(buildRawEntreprise({ date_creation: dateStr }));
      expect(entity.ancienneteJours).toBeGreaterThanOrEqual(1);
      expect(entity.ancienneteJours).toBeLessThanOrEqual(2);
    });
  });

  // ── toPaginated ───────────────────────────────

  describe('toPaginated()', () => {
    it('retourne une liste vide si results est vide', () => {
      const raw = buildRawSearchResponse([]);
      const result = mapper.toPaginated(raw);

      expect(result.results).toHaveLength(0);
      expect(result.totalResults).toBe(0);
    });

    it('mappe toutes les entités de la liste', () => {
      const raw = buildRawSearchResponse([
        buildRawEntreprise({ siren: '111111111' }),
        buildRawEntreprise({ siren: '222222222' }),
        buildRawEntreprise({ siren: '333333333' }),
      ]);
      const result = mapper.toPaginated(raw);

      expect(result.results).toHaveLength(3);
      expect(result.results.map((e) => e.siren)).toEqual([
        '111111111',
        '222222222',
        '333333333',
      ]);
    });

    it('mappe correctement la pagination', () => {
      const raw = buildRawSearchResponse(
        [buildRawEntreprise()],
        { total_results: 150, page: 3, per_page: 20, total_pages: 8 },
      );
      const result = mapper.toPaginated(raw);

      expect(result.totalResults).toBe(150);
      expect(result.page).toBe(3);
      expect(result.perPage).toBe(20);
      expect(result.totalPages).toBe(8);
    });
  });
});
