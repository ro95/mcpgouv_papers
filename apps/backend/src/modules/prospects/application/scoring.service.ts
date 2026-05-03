import { Injectable } from '@nestjs/common';
import { Entreprise } from '../../entreprises/domain/entreprise.entity';
import { ProspectScore, WebsiteSignals } from '../domain/prospect.entity';

const TIER_HOT = 9;
const TIER_WARM = 5;

@Injectable()
export class ScoringService {
  /**
   * Score gratuit (zéro crédit Pappers) basé sur SIRENE + probe HTTP.
   */
  score(entreprise: Entreprise, website: WebsiteSignals | null): ProspectScore {
    const breakdown: Record<string, number> = {};

    const formeJuridique = this.detectFormeJuridique(
      entreprise.nomRaisonSociale,
      entreprise.categorieJuridique,
    );
    if (formeJuridique === 'SAS' || formeJuridique === 'SASU') breakdown.forme_sas = 2;
    else if (formeJuridique === 'SARL') breakdown.forme_sarl = 1;

    const days = entreprise.ancienneteJours;
    if (days >= 90 && days <= 180) breakdown.sweet_spot = 2;
    else if (days > 180 && days <= 270) breakdown.warm_window = 1;

    if (entreprise.dirigeants?.length > 0) breakdown.has_dirigeant = 1;

    if (website) {
      if (website.verdict === 'no-site') breakdown.no_website = 5;
      else if (website.verdict === 'obsolete') {
        breakdown.obsolete_website = Math.min(website.obsolescenceScore, 6);
      }
      if (website.performanceScore !== null && website.performanceScore < 50) {
        breakdown.poor_lighthouse_perf = 3;
      }
    }

    const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
    return {
      total,
      breakdown,
      tier: total >= TIER_HOT ? 'hot' : total >= TIER_WARM ? 'warm' : 'cold',
    };
  }

  private detectFormeJuridique(
    nom: string,
    categorieJuridique: string | null,
  ): 'SAS' | 'SASU' | 'SARL' | 'EURL' | 'AUTRE' {
    // Codes INSEE catégorie juridique : https://www.insee.fr/fr/information/2028129
    if (categorieJuridique) {
      if (categorieJuridique === '5710') return 'SAS';
      if (categorieJuridique === '5720') return 'SASU';
      if (categorieJuridique === '5499') return 'SARL';
      if (categorieJuridique === '5485') return 'EURL';
    }
    const upper = nom.toUpperCase();
    if (/\bSASU\b/.test(upper)) return 'SASU';
    if (/\bSAS\b/.test(upper)) return 'SAS';
    if (/\bEURL\b/.test(upper)) return 'EURL';
    if (/\bSARL\b/.test(upper)) return 'SARL';
    return 'AUTRE';
  }
}
