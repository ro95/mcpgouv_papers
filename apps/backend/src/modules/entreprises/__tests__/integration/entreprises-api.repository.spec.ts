import { Test, TestingModule } from '@nestjs/testing';
import { EntreprisesApiRepository } from '../../infrastructure/repositories/entreprises-api.repository';
import { RechercheEntreprisesClient } from '../../infrastructure/http-clients/recherche-entreprises.client';
import { SireneTabularClient } from '../../infrastructure/http-clients/sirene-tabular.client';
import { InseeApiClient } from '../../infrastructure/http-clients/insee-api.client';
import { EntrepriseApiMapper } from '../../infrastructure/mappers/entreprise-api.mapper';
import { SireneTabularMapper } from '../../infrastructure/mappers/sirene-tabular.mapper';
import { InseeApiMapper } from '../../infrastructure/mappers/insee-api.mapper';
import type { RawSearchResponse } from '../../infrastructure/http-clients/recherche-entreprises.client';
import type { TabularApiResponse } from '../../infrastructure/http-clients/sirene-tabular.client';
import type { InseeSearchResponse } from '../../infrastructure/http-clients/insee-api.client';

const SEARCH_RESPONSE: RawSearchResponse = {
  results: [{
    siren: '123456789', nom_raison_sociale: 'ACME SAS',
    date_creation: '2024-11-01', activite_principale: '62.01Z',
    libelle_activite_principale: 'Programmation informatique',
    categorie_entreprise: 'PME', etat_administratif: 'A',
    siege: { siret: '12345678900011', code_postal: '75001', libelle_commune: 'PARIS', departement: '75', region: '11', adresse: '1 RUE DE LA PAIX' },
    nombre_etablissements: 1, nombre_etablissements_ouverts: 1,
    tranche_effectif_salarie: null, date_immatriculation: null,
  }],
  total_results: 1, page: 1, per_page: 20, total_pages: 1,
};

const TABULAR_RESPONSE: TabularApiResponse = {
  data: [{
    siren: '987654321', denominationUniteLegale: 'STARTUP RÉCENTE SAS',
    denominationUsuelle1UniteLegale: null, nomUniteLegale: null,
    prenomUsuelUniteLegale: null, dateCreationUniteLegale: '2026-03-01',
    activitePrincipaleUniteLegale: '62.01Z', categorieEntrepriseUniteLegale: 'PME',
    etatAdministratifUniteLegale: 'A', trancheEffectifsUniteLegale: null,
    categorieJuridiqueUniteLegale: '5710', nicsiegeUniteLegale: '00011',
  }],
  meta: { total: 1, page: 1, page_size: 20 },
};

const INSEE_RESPONSE: InseeSearchResponse = {
  header: { statut: 200, message: 'ok', total: 5, debut: 0, nombre: 5 },
  unitesLegales: [{
    siren: '111222333',
    dateCreationUniteLegale: '2026-03-15',
    trancheEffectifsUniteLegale: 'NN',
    categorieEntrepriseUniteLegale: null,
    statutDiffusionUniteLegale: 'O',
    periodesUniteLegale: [{
      dateFin: null, dateDebut: '2026-03-15',
      etatAdministratifUniteLegale: 'A',
      denominationUniteLegale: 'NOUVELLE SAS',
      denominationUsuelle1UniteLegale: null,
      nomUniteLegale: null, prenomUsuelUniteLegale: null,
      activitePrincipaleUniteLegale: '62.01Z',
      categorieJuridiqueUniteLegale: '5710',
      nicSiegeUniteLegale: '00011',
    }],
  }],
};

describe('EntreprisesApiRepository (integration)', () => {
  let repository: EntreprisesApiRepository;
  let searchClient: jest.Mocked<RechercheEntreprisesClient>;
  let tabularClient: jest.Mocked<SireneTabularClient>;
  let inseeClient: jest.Mocked<InseeApiClient>;

  beforeEach(async () => {
    searchClient = { search: jest.fn(), findBySiren: jest.fn() } as unknown as jest.Mocked<RechercheEntreprisesClient>;
    tabularClient = { findRecent: jest.fn() } as unknown as jest.Mocked<SireneTabularClient>;
    inseeClient = { findRecent: jest.fn(), isConfigured: false } as unknown as jest.Mocked<InseeApiClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntreprisesApiRepository,
        { provide: RechercheEntreprisesClient, useValue: searchClient },
        { provide: SireneTabularClient, useValue: tabularClient },
        { provide: InseeApiClient, useValue: inseeClient },
        EntrepriseApiMapper,
        SireneTabularMapper,
        InseeApiMapper,
      ],
    }).compile();

    repository = module.get<EntreprisesApiRepository>(EntreprisesApiRepository);
  });

  describe('search()', () => {
    it('transmet les filtres à l\'API sans paramètres date', async () => {
      searchClient.search.mockResolvedValue(SEARCH_RESPONSE);
      await repository.search({ query: 'tech', page: 2, perPage: 10, departement: '69', etatAdministratif: 'A' });
      const call = searchClient.search.mock.calls[0][0];
      expect(call).toMatchObject({ q: 'tech', page: 2, departement: '69', etat_administratif: 'A' });
      expect(call).not.toHaveProperty('date_creation_min');
    });

    it('plafonne per_page à 25', async () => {
      searchClient.search.mockResolvedValue(SEARCH_RESPONSE);
      await repository.search({ perPage: 100 });
      expect(searchClient.search.mock.calls[0][0].per_page).toBeLessThanOrEqual(25);
    });
  });

  describe('findRecent() — avec INSEE configuré', () => {
    beforeEach(() => {
      Object.defineProperty(inseeClient, 'isConfigured', { get: () => true });
    });

    it('utilise InseeApiClient en priorité', async () => {
      inseeClient.findRecent.mockResolvedValue(INSEE_RESPONSE);
      const result = await repository.findRecent(7, 1, 20);
      expect(inseeClient.findRecent).toHaveBeenCalled();
      expect(tabularClient.findRecent).not.toHaveBeenCalled();
      expect(result.results[0].siren).toBe('111222333');
      expect(result.results[0].dateCreation).toBe('2026-03-15');
    });
  });

  describe('findRecent() — sans INSEE (fallback tabular)', () => {
    it('utilise SireneTabularClient quand INSEE non configuré', async () => {
      tabularClient.findRecent.mockResolvedValue(TABULAR_RESPONSE);
      await repository.findRecent(7, 1, 20);
      expect(tabularClient.findRecent).toHaveBeenCalled();
    });

    it('vérifie la plage de dates', async () => {
      tabularClient.findRecent.mockResolvedValue(TABULAR_RESPONSE);
      await repository.findRecent(7, 1, 20);
      const [dateMin, dateMax] = tabularClient.findRecent.mock.calls[0];
      const diffDays = Math.round((new Date(dateMax).getTime() - new Date(dateMin).getTime()) / 86400000);
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(8);
    });
  });

  describe('findBySiren()', () => {
    it('retourne null si non trouvé', async () => {
      searchClient.findBySiren.mockResolvedValue(null);
      expect(await repository.findBySiren('000000000')).toBeNull();
    });

    it('retourne l\'entité mappée', async () => {
      searchClient.findBySiren.mockResolvedValue(SEARCH_RESPONSE.results[0]);
      expect((await repository.findBySiren('123456789'))?.siren).toBe('123456789');
    });
  });
});
