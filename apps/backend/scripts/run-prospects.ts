/**
 * Script standalone — exécute le pipeline "nouveaux entrants" sans démarrer le serveur HTTP.
 *
 * Usage : pnpm --filter api-entreprises tsx scripts/run-prospects.ts
 *         (ou : npx ts-node scripts/run-prospects.ts depuis apps/backend/)
 *
 * Sortie : écrit le rapport markdown sur stdout ET dans reports/<YYYY-MM-DD>-prospects.md
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from '../src/app.module';
import { ProspectsService } from '../src/modules/prospects/application/prospects.service';
import { Prospect } from '../src/modules/prospects/domain/prospect.entity';

const SECTIONS = [
  { code: 'I', label: 'Restauration / hébergement' },
  { code: 'F', label: 'Construction / BTP' },
  { code: 'M', label: 'Conseil & services pros' },
  { code: 'Q', label: 'Santé libérale' },
  { code: 'G', label: 'Commerce' },
  { code: 'J', label: 'Tech / IT / médias' },
];

// Filtre département via env var TARGET_DEPARTEMENT (ex: "93" pour Seine-Saint-Denis).
// Vide = scan national (jusqu'à 200 résultats par section).
const TARGET_DEPARTEMENT = process.env.TARGET_DEPARTEMENT?.trim() || undefined;

interface SectionResult {
  section: { code: string; label: string };
  prospects: Prospect[];
  totalScanned: number;
}

async function main() {
  const logger = new Logger('run-prospects');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const service = app.get(ProspectsService);

    const sectionResults: SectionResult[] = [];
    for (const section of SECTIONS) {
      logger.log(`▶️  Section ${section.code} — ${section.label}`);
      try {
        const res = await service.findNouveauxEntrants({
          ageMinDays: 90,
          ageMaxDays: 270,
          sectionActivite: section.code,
          departement: TARGET_DEPARTEMENT,
          probeWebsite: true,
          runLighthouse: false,
          minScore: 5,
          page: 1,
          perPage: 50,
        });
        sectionResults.push({
          section,
          prospects: res.results,
          totalScanned: res.totalScanned,
        });
        logger.log(
          `   ✅ ${res.results.length} leads (${res.totalAfterFilter} ≥5 / ${res.totalScanned} scannés)`,
        );
      } catch (err) {
        logger.error(`   ❌ ${section.code} : ${err instanceof Error ? err.message : err}`);
      }
    }

    const report = buildReport(sectionResults);
    writeReport(report);
    process.stdout.write(report);
  } finally {
    await app.close();
  }
}

function buildReport(sectionResults: SectionResult[]): string {
  const today = new Date().toISOString().split('T')[0];
  const allProspects = sectionResults.flatMap((s) =>
    s.prospects.map((p) => ({ ...p, sectionLabel: s.section.label, sectionCode: s.section.code })),
  );

  const hot = allProspects.filter((p) => p.score.tier === 'hot').sort((a, b) => b.score.total - a.score.total);
  const warm = allProspects.filter((p) => p.score.tier === 'warm').sort((a, b) => b.score.total - a.score.total);
  const cold = allProspects.filter((p) => p.score.tier === 'cold');
  const totalScanned = sectionResults.reduce((sum, s) => sum + s.totalScanned, 0);

  const lines: string[] = [];
  lines.push(`# 🎯 Prospects hot — semaine du ${today}`);
  lines.push('');
  if (TARGET_DEPARTEMENT) {
    lines.push(`**Zone ciblée** : département ${TARGET_DEPARTEMENT}`);
    lines.push('');
  }
  lines.push(`**Résumé** : ${hot.length} hot · ${warm.length} warm · ${cold.length} cold · ${totalScanned} entreprises scannées au total`);
  lines.push('');
  lines.push(`Sections couvertes : ${sectionResults.map((s) => `${s.section.code} (${s.prospects.length})`).join(' · ')}`);
  lines.push('');

  if (hot.length === 0) {
    lines.push('> Aucun lead `hot` cette semaine — élargir la fenêtre ou les sections.');
    lines.push('');
  }

  const renderWebsite = (w: Prospect['website']): string[] => {
    if (!w) return ['- **Site web** : _non sondé_'];

    if (w.verdict === 'no-site') {
      return [
        `- **Site web** : ❌ **Aucun site détecté**`,
        `  - Domaines testés : \`${w.domainTried}\` (.fr, .com)`,
        `  - 💡 Opportunité : pas de présence web → leur proposer la création complète`,
      ];
    }

    if (w.verdict === 'obsolete') {
      const url = w.finalUrl ?? `https://${w.domainTried}`;
      const reasons: string[] = [];
      if (!w.https) reasons.push(`  - ❌ Pas de HTTPS — site insécurisé (Chrome affiche un avertissement)`);
      if (!w.hasViewport) reasons.push(`  - ❌ Pas de viewport responsive — cassé sur mobile`);
      if (w.usesJquery) reasons.push(`  - ❌ Utilise jQuery — stack datée (2010s)`);
      if (w.copyrightYear !== null && w.copyrightYear < 2022) {
        reasons.push(`  - ❌ Copyright \`${w.copyrightYear}\` — jamais mis à jour depuis ${new Date().getFullYear() - w.copyrightYear} ans`);
      }
      if (w.performanceScore !== null && w.performanceScore < 50) {
        reasons.push(`  - ❌ Lighthouse perf \`${w.performanceScore}/100\` — site lent`);
      }
      if (w.seoScore !== null && w.seoScore < 70) {
        reasons.push(`  - ❌ Lighthouse SEO \`${w.seoScore}/100\` — mauvais référencement`);
      }
      return [
        `- **Site web** : ⚠️ Site **obsolète** : ${url}`,
        ...reasons,
        `  - 💡 Opportunité : refonte complète — visibles mais perdent en crédibilité face aux concurrents modernes`,
      ];
    }

    const url = w.finalUrl ?? `https://${w.domainTried}`;
    const scores: string[] = [];
    if (w.performanceScore !== null) scores.push(`perf ${w.performanceScore}`);
    if (w.seoScore !== null) scores.push(`SEO ${w.seoScore}`);
    if (w.bestPracticesScore !== null) scores.push(`bonnes pratiques ${w.bestPracticesScore}`);
    return [
      `- **Site web** : ✅ Site moderne : ${url}` +
        (scores.length ? ` (Lighthouse : ${scores.join(' · ')})` : ''),
    ];
  };

  const renderProspect = (p: typeof allProspects[number], idx: number): string => {
    const e = p.entreprise;
    const dirigeant = e.dirigeants?.[0];
    const dirText = dirigeant
      ? `${dirigeant.prenom ?? ''} ${dirigeant.nom}${dirigeant.qualite ? ` (${dirigeant.qualite})` : ''}`.trim()
      : '_inconnu_';

    const websiteBlock = renderWebsite(p.website);

    const breakdown = Object.entries(p.score.breakdown)
      .map(([k, v]) => `${k}=+${v}`)
      .join(' · ');

    const villeText = e.siege.libelleCommune
      ? `${e.siege.libelleCommune} (${e.siege.codePostal}, dépt ${e.siege.departement})`
      : '_(siege non récupérable côté INSEE — voir liens ci-dessous)_';

    const annuaireUrl = `https://annuaire-entreprises.data.gouv.fr/entreprise/${e.siren}`;
    const pappersUrl = `https://www.pappers.fr/entreprise/${e.siren}`;

    const block: string[] = [];
    block.push(`### ${idx + 1}. ${e.nomRaisonSociale} — score ${p.score.total} (${p.score.tier})`);
    block.push('');
    block.push(`- **SIREN** : \`${e.siren}\``);
    block.push(`- **Activité** : ${e.libelleActivitePrincipale} (NAF \`${e.activitePrincipale}\`, section ${p.sectionCode})`);
    block.push(`- **Ville** : ${villeText}`);
    if (dirigeant) block.push(`- **Dirigeant** : ${dirText}`);
    block.push(`- **Créée le** : ${e.dateCreation} (${e.ancienneteJours} jours)`);
    block.push(...websiteBlock);
    block.push(`- **Score breakdown** : ${breakdown || '_aucun_'}`);
    block.push(`- **Recherche complémentaire** : [annuaire-entreprises](${annuaireUrl}) · [Pappers](${pappersUrl})`);
    block.push('');
    return block.join('\n');
  };

  if (hot.length > 0) {
    lines.push('## 🔥 Tier HOT (à attaquer en priorité)');
    lines.push('');
    hot.forEach((p, idx) => lines.push(renderProspect(p, idx)));
  }

  if (warm.length > 0) {
    lines.push('## 🌡️ Tier WARM');
    lines.push('');
    warm.slice(0, 20).forEach((p, idx) => lines.push(renderProspect(p, idx)));
    if (warm.length > 20) {
      lines.push(`_… et ${warm.length - 20} autres warm non listés_`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function writeReport(report: string): void {
  const today = new Date().toISOString().split('T')[0];
  const dir = resolve(process.cwd(), 'reports');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${today}-prospects.md`);
  writeFileSync(path, report, 'utf-8');
  process.stderr.write(`📝 Rapport écrit : ${path}\n`);
}

main().catch((err) => {
  process.stderr.write(`❌ Pipeline failed: ${err instanceof Error ? err.stack : err}\n`);
  process.exit(1);
});
