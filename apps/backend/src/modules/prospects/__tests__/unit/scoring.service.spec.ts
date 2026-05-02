import { Entreprise } from '../../../entreprises/domain/entreprise.entity';
import { ScoringService } from '../../application/scoring.service';
import { WebsiteSignals } from '../../domain/prospect.entity';

function makeEntreprise(overrides: Partial<{ nom: string; ageDays: number }> = {}): Entreprise {
  const ageDays = overrides.ageDays ?? 120;
  const dateCreation = new Date(Date.now() - ageDays * 86_400_000)
    .toISOString()
    .split('T')[0];
  return new Entreprise(
    '123456789',
    overrides.nom ?? 'Atelier Bois SAS',
    dateCreation,
    '47.11D',
    'Commerce',
    null,
    'A',
    {
      siret: '12345678900010',
      codePostal: '75001',
      libelleCommune: 'Paris',
      departement: '75',
      region: 'IDF',
      adresse: '1 rue de Test',
    },
    1,
    1,
    null,
    dateCreation,
    [{ nom: 'Dupont', prenom: 'Jean', qualite: 'Président', estPersonnePhysique: true }],
  );
}

function noSiteSignals(): WebsiteSignals {
  return {
    domainTried: 'atelier-bois.fr',
    reachable: false,
    https: false,
    validTls: false,
    hasViewport: false,
    usesJquery: false,
    copyrightYear: null,
    serverHeader: null,
    finalUrl: null,
    performanceScore: null,
    seoScore: null,
    bestPracticesScore: null,
    obsolescenceScore: 10,
    verdict: 'no-site',
  };
}

function obsoleteSignals(): WebsiteSignals {
  return {
    domainTried: 'atelier-bois.fr',
    reachable: true,
    https: false,
    validTls: false,
    hasViewport: false,
    usesJquery: true,
    copyrightYear: 2018,
    serverHeader: 'Apache/2.2',
    finalUrl: 'http://atelier-bois.fr',
    performanceScore: 25,
    seoScore: 60,
    bestPracticesScore: 50,
    obsolescenceScore: 12,
    verdict: 'obsolete',
  };
}

describe('ScoringService', () => {
  const service = new ScoringService();

  it('marks no-site SAS in sweet spot as hot', () => {
    const e = makeEntreprise({ nom: 'Atelier Bois SAS', ageDays: 120 });
    const score = service.score(e, noSiteSignals());
    expect(score.tier).toBe('hot');
    expect(score.breakdown).toEqual(
      expect.objectContaining({
        forme_sas: 2,
        sweet_spot: 2,
        has_dirigeant: 1,
        no_website: 5,
      }),
    );
  });

  it('flags obsolete website with poor lighthouse', () => {
    const e = makeEntreprise({ nom: 'Atelier Bois SAS', ageDays: 200 });
    const score = service.score(e, obsoleteSignals());
    expect(score.breakdown.obsolete_website).toBeGreaterThan(0);
    expect(score.breakdown.poor_lighthouse_perf).toBe(3);
  });

  it('scores low when modern website + outside window', () => {
    const e = makeEntreprise({ nom: 'Boulangerie Sans Forme', ageDays: 800 });
    const modern: WebsiteSignals = {
      ...obsoleteSignals(),
      https: true,
      hasViewport: true,
      usesJquery: false,
      copyrightYear: 2025,
      obsolescenceScore: 0,
      verdict: 'modern',
      performanceScore: 90,
    };
    const score = service.score(e, modern);
    expect(score.tier).toBe('cold');
  });
});
