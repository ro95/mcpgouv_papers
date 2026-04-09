import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EntreprisesService } from '../../application/entreprises.service';
import {
  IEntreprisesRepository,
  ENTREPRISES_REPOSITORY,
} from '../../domain/ports/entreprises.repository.port';
import { Entreprise, PaginatedEntreprises } from '../../domain/entreprise.entity';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function buildEntreprise(): Entreprise {
  return new Entreprise(
    '123456789',
    'ACME SAS',
    '2024-03-01',
    '62.01Z',
    'Programmation informatique',
    'PME',
    'A',
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

function buildPaginated(overrides: Partial<PaginatedEntreprises> = {}): PaginatedEntreprises {
  return {
    results: [buildEntreprise()],
    totalResults: 42,
    page: 1,
    perPage: 20,
    totalPages: 3,
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// Mock du repository
// ─────────────────────────────────────────────

const mockRepository: jest.Mocked<IEntreprisesRepository> = {
  search: jest.fn(),
  findRecent: jest.fn(),
  findBySiren: jest.fn(),
};

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe('EntreprisesService', () => {
  let service: EntreprisesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntreprisesService,
        { provide: ENTREPRISES_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<EntreprisesService>(EntreprisesService);
  });

  // ── search ────────────────────────────────────

  describe('search()', () => {
    it('délègue au repository avec les bons paramètres', async () => {
      const paginated = buildPaginated();
      mockRepository.search.mockResolvedValue(paginated);

      const result = await service.search({
        q: 'boulangerie',
        page: 2,
        perPage: 10,
        departement: '75',
        etatAdministratif: 'A',
      });

      expect(mockRepository.search).toHaveBeenCalledWith({
        query: 'boulangerie',
        page: 2,
        perPage: 10,
        codePostal: undefined,
        departement: '75',
        activitePrincipale: undefined,
        dateCreationMin: undefined,
        dateCreationMax: undefined,
        etatAdministratif: 'A',
      });
      expect(result).toBe(paginated);
    });

    it('retourne les résultats du repository', async () => {
      const paginated = buildPaginated({ totalResults: 1337 });
      mockRepository.search.mockResolvedValue(paginated);

      const result = await service.search({});
      expect(result.totalResults).toBe(1337);
    });

    it('propage les erreurs du repository', async () => {
      mockRepository.search.mockRejectedValue(new Error('API down'));
      await expect(service.search({})).rejects.toThrow('API down');
    });
  });

  // ── findRecent ────────────────────────────────

  describe('findRecent()', () => {
    it('appelle repository.findRecent avec les bons paramètres', async () => {
      mockRepository.findRecent.mockResolvedValue(buildPaginated());

      await service.findRecent({ days: 7, page: 1, perPage: 20 });

      expect(mockRepository.findRecent).toHaveBeenCalledWith(7, 1, 20);
    });

    it('utilise les valeurs par défaut quand les params sont absents', async () => {
      mockRepository.findRecent.mockResolvedValue(buildPaginated());

      await service.findRecent({});

      expect(mockRepository.findRecent).toHaveBeenCalledWith(30, 1, 20);
    });
  });

  // ── findBySiren ───────────────────────────────

  describe('findBySiren()', () => {
    it('retourne l\'entreprise quand elle est trouvée', async () => {
      const entreprise = buildEntreprise();
      mockRepository.findBySiren.mockResolvedValue(entreprise);

      const result = await service.findBySiren('123456789');
      expect(result).toBe(entreprise);
      expect(mockRepository.findBySiren).toHaveBeenCalledWith('123456789');
    });

    it('lève NotFoundException quand le SIREN est introuvable', async () => {
      mockRepository.findBySiren.mockResolvedValue(null);

      await expect(service.findBySiren('000000000')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('le message d\'erreur contient le SIREN recherché', async () => {
      mockRepository.findBySiren.mockResolvedValue(null);

      await expect(service.findBySiren('999999999')).rejects.toThrow(
        'SIREN 999999999',
      );
    });
  });

  // ── getStats ──────────────────────────────────

  describe('getStats()', () => {
    it('retourne le bon nombre de créations et la période', async () => {
      mockRepository.search.mockResolvedValue(
        buildPaginated({ totalResults: 500 }),
      );

      const stats = await service.getStats(30);

      expect(stats.totalRecentCreations).toBe(500);
      expect(stats.periodDays).toBe(30);
      expect(stats.dateMin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(stats.dateMax).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('utilise 30 jours par défaut', async () => {
      mockRepository.search.mockResolvedValue(buildPaginated());
      const stats = await service.getStats();
      expect(stats.periodDays).toBe(30);
    });

    it('passe etatAdministratif=A au repository', async () => {
      mockRepository.search.mockResolvedValue(buildPaginated());
      await service.getStats(7);

      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({ etatAdministratif: 'A', perPage: 1 }),
      );
    });
  });
});
