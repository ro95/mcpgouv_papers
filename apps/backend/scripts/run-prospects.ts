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
];

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
  lines.push(`**Résumé** : ${hot.length} hot · ${warm.length} warm · ${cold.length} cold · ${totalScanned} entreprises scannées au total`);
  lines.push('');
  lines.push(`Sections couvertes : ${sectionResults.map((s) => `${s.section.code} (${s.prospects.length})`).join(' · ')}`);
  lines.push('');

  if (hot.length === 0) {
    lines.push('> Aucun lead `hot` cette semaine — élargir la fenêtre ou les sections.');
    lines.push('');
  }

  const renderProspect = (p: typeof allProspects[number], idx: number): string => {
    const e = p.entreprise;
    const dirigeant = e.dirigeants?.[0];
    const dirText = dirigeant
      ? `${dirigeant.prenom ?? ''} ${dirigeant.nom}${dirigeant.qualite ? ` (${dirigeant.qualite})` : ''}`.trim()
      : '_inconnu_';

    const websiteText = !p.website
      ? '_non sondé_'
      : p.website.verdict === 'no-site'
      ? `❌ **Aucun site détecté** (essayé : \`${p.website.domainTried}\`)`
      : p.website.verdict === 'obsolete'
      ? `⚠️ Site obsolète : \`${p.website.finalUrl ?? p.website.domainTried}\` (score obs. ${p.website.obsolescenceScore})`
      : `✅ Site moderne : \`${p.website.finalUrl ?? p.website.domainTried}\``;

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
    block.push(`- **Site web** : ${websiteText}`);
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
