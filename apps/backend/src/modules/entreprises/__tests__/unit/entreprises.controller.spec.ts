import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EntreprisesController } from '../../presentation/entreprises.controller';
import { EntreprisesService } from '../../application/entreprises.service';
import { Entreprise, PaginatedEntreprises } from '../../domain/entreprise.entity';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeEntreprise(siren = '123456789'): Entreprise {
  return new Entreprise(
    siren,
    'ACME SAS',
    '2024-06-01',
    '62.01Z',
    'Programmation informatique',
    'PME',
    'A',
    {
      siret: `${siren}00011`,
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

function makePaginated(results: Entreprise[] = [makeEntreprise()]): PaginatedEntreprises {
  return {
    results,
    totalResults: results.length,
    page: 1,
    perPage: 20,
    totalPages: 1,
  };
}

// ─────────────────────────────────────────────
// Mock du service
// ─────────────────────────────────────────────

const mockService: jest.Mocked<EntreprisesService> = {
  search: jest.fn(),
  findRecent: jest.fn(),
  findBySiren: jest.fn(),
  getStats: jest.fn(),
} as unknown as jest.Mocked<EntreprisesService>;

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe('EntreprisesController', () => {
  let controller: EntreprisesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntreprisesController],
      providers: [{ provide: EntreprisesService, useValue: mockService }],
    }).compile();

    controller = module.get<EntreprisesController>(EntreprisesController);
  });

  // ── getRecentes ───────────────────────────────

  describe('getRecentes()', () => {
    it('retourne une réponse paginée correctement structurée', async () => {
      const paginated = makePaginated([makeEntreprise('111111111')]);
      mockService.findRecent.mockResolvedValue(paginated);

      const response = await controller.getRecentes({ days: 30, page: 1, perPage: 20 });

      expect(response.results).toHaveLength(1);
      expect(response.results[0].siren).toBe('111111111');
      expect(response.pagination.totalResults).toBe(1);
    });

    it('inclut ancienneteJours dans chaque DTO', async () => {
      mockService.findRecent.mockResolvedValue(makePaginated());

      const response = await controller.getRecentes({});
      expect(response.results[0]).toHaveProperty('ancienneteJours');
      expect(typeof response.results[0].ancienneteJours).toBe('number');
    });
  });

  // ── search ────────────────────────────────────

  describe('search()', () => {
    it('délègue à EntreprisesService.search', async () => {
      mockService.search.mockResolvedValue(makePaginated());

      await controller.search({ q: 'artisan', page: 1, perPage: 10 });

      expect(mockService.search).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'artisan' }),
      );
    });

    it('retourne la pagination correctement', async () => {
      mockService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        page: 1,
        perPage: 20,
        totalPages: 0,
      });

      const response = await controller.search({});
      expect(response.pagination).toMatchObject({
        totalResults: 0,
        page: 1,
        perPage: 20,
        totalPages: 0,
      });
    });
  });

  // ── getStats ──────────────────────────────────

  describe('getStats()', () => {
    it('utilise 30 jours par défaut', async () => {
      mockService.getStats.mockResolvedValue({
        totalRecentCreations: 100,
        periodDays: 30,
        dateMin: '2024-01-01',
        dateMax: '2024-01-31',
      });

      await controller.getStats(undefined);
      expect(mockService.getStats).toHaveBeenCalledWith(30);
    });

    it('parse le paramètre days en nombre entier', async () => {
      mockService.getStats.mockResolvedValue({
        totalRecentCreations: 50,
        periodDays: 7,
        dateMin: '2024-01-25',
        dateMax: '2024-01-31',
      });

      await controller.getStats('7');
      expect(mockService.getStats).toHaveBeenCalledWith(7);
    });
  });

  // ── findBySiren ───────────────────────────────

  describe('findBySiren()', () => {
    it('retourne le DTO de l\'entreprise quand elle existe', async () => {
      const entreprise = makeEntreprise('987654321');
      mockService.findBySiren.mockResolvedValue(entreprise);

      const dto = await controller.findBySiren('987654321');

      expect(dto.siren).toBe('987654321');
      expect(dto.nomRaisonSociale).toBe('ACME SAS');
      expect(dto.siege.codePostal).toBe('75001');
    });

    it('laisse remonter NotFoundException du service', async () => {
      mockService.findBySiren.mockRejectedValue(
        new NotFoundException('Entreprise SIREN 000000000 introuvable'),
      );

      await expect(controller.findBySiren('000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
