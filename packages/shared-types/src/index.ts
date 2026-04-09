import { z } from 'zod';

// ─────────────────────────────────────────────
// Package @mcpgouv/shared-types
//
// Source de vérité unique pour les types et schémas
// partagés entre le backend (NestJS) et le frontend (Next.js).
//
// Les types TypeScript sont inférés depuis les schémas Zod —
// ils ne sont jamais écrits à la main.
// ─────────────────────────────────────────────

// ── Schémas ───────────────────────────────────

// Dirigeant d'une entreprise (utile pour la prospection)
export const DirigeantSchema = z.object({
  nom: z.string(),
  prenom: z.string().nullable(),
  qualite: z.string().nullable(),
  estPersonnePhysique: z.boolean(),
});

export const SiegeSchema = z.object({
  siret: z.string(),
  codePostal: z.string(),
  libelleCommune: z.string(),
  departement: z.string(),
  region: z.string(),
  adresse: z.string(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export const EntrepriseSchema = z.object({
  siren: z.string().length(9, 'Le SIREN doit contenir 9 chiffres'),
  nomRaisonSociale: z.string(),
  dateCreation: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date invalide (YYYY-MM-DD)'),
  activitePrincipale: z.string(),
  libelleActivitePrincipale: z.string(),
  categorieEntreprise: z.string().nullable(),
  etatAdministratif: z.enum(['A', 'C']),
  siege: SiegeSchema,
  nombreEtablissements: z.number().int().nonnegative(),
  nombreEtablissementsOuverts: z.number().int().nonnegative(),
  trancheEffectifSalarie: z.string().nullable(),
  dateImmatriculation: z.string().nullable(),
  ancienneteJours: z.number().int().nonnegative(),
  dirigeants: z.array(DirigeantSchema).default([]),
});

export const PaginationMetaSchema = z.object({
  totalResults: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  perPage: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export const PaginatedEntreprisesSchema = z.object({
  results: z.array(EntrepriseSchema),
  pagination: PaginationMetaSchema,
});

export const EntreprisesStatsSchema = z.object({
  totalRecentCreations: z.number().int().nonnegative(),
  periodDays: z.number().int().positive(),
  dateMin: z.string(),
  dateMax: z.string(),
});

// Enrichissement Pappers (site web, email, téléphone, CA)
export const EnrichmentSchema = z.object({
  siren: z.string(),
  siteWeb: z.string().nullable(),
  email: z.string().nullable(),
  telephone: z.string().nullable(),
  chiffreAffaires: z.number().nullable(),
  resultat: z.number().nullable(),
  effectifs: z.number().nullable(),
  source: z.literal('pappers'),
  disponible: z.boolean(),
  erreur: z.string().nullable().optional(),
});

// Envelope générique { data, success, timestamp } renvoyée par le backend
export const ApiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    success: z.boolean(),
    timestamp: z.string(),
  });

// ── Types inférés ─────────────────────────────

export type Dirigeant = z.infer<typeof DirigeantSchema>;
export type Siege = z.infer<typeof SiegeSchema>;
export type Entreprise = z.infer<typeof EntrepriseSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
export type PaginatedEntreprises = z.infer<typeof PaginatedEntreprisesSchema>;
export type EntreprisesStats = z.infer<typeof EntreprisesStatsSchema>;
export type Enrichment = z.infer<typeof EnrichmentSchema>;

// ── Paramètres de requête (utilisés côté frontend et tests) ───

export interface SearchEntreprisesParams {
  q?: string;
  page?: number;
  perPage?: number;
  codePostal?: string;
  departement?: string;
  activitePrincipale?: string;
  dateCreationMin?: string;
  dateCreationMax?: string;
  etatAdministratif?: 'A' | 'C';
  trancheEffectifSalarie?: string;
}

export interface RecentEntreprisesParams {
  days?: number;
  page?: number;
  perPage?: number;
  departement?: string;
  activitePrincipale?: string;
  sectionActivite?: string; // Lettre de section INSEE : F=BTP, Q=Santé, I=Restauration...
  trancheEffectifSalarie?: string;
  etatAdministratif?: 'A' | 'C';
}
