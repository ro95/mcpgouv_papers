# Ouvertures d'Entreprises — data.gouv.fr

Monorepo full-stack pour explorer les récentes créations d'entreprises françaises via les données ouvertes de data.gouv.fr.

## Stack

| Couche | Techno | Version |
|---|---|---|
| Monorepo | **Turborepo** + pnpm workspaces | 2.x |
| Backend | **NestJS** (Node.js, TypeScript) | 10.x |
| Frontend | **Next.js** (App Router, React 19) | 16.x |
| Types partagés | **Zod** (schémas + inférence TypeScript) | 3.x |
| Data | **API Recherche d'entreprises** + **MCP data.gouv.fr** | — |
| Style | Tailwind CSS | 3.x |
| State / Cache | TanStack Query | 5.x |
| Tests | **Jest** + ts-jest | 29.x |

## Structure du monorepo

```
mcpgouv/
├── package.json              # Scripts globaux (turbo run dev/build/test)
├── turbo.json                # Pipeline Turborepo + cache
├── pnpm-workspace.yaml       # Déclare apps/* et packages/*
│
├── apps/
│   ├── backend/              # NestJS — API REST
│   └── frontend/             # Next.js — Interface web
│
└── packages/
    └── shared-types/         # Schémas Zod + types partagés back ↔ front
```

## Architecture

### Principes appliqués

**SOLID** — chaque classe a une responsabilité unique. L'injection via le token `ENTREPRISES_REPOSITORY` inverse la dépendance (D) : le service dépend de l'interface `IEntreprisesRepository`, jamais de l'implémentation concrète.

**Clean Code** — nommage expressif, fonctions courtes, zéro logique dans le contrôleur, mapper dédié à la transformation de données, types stricts partout.

**Architecture hexagonale (Ports & Adapters)** côté backend :

```
Présentation  →  Controller (thin)
Application   →  Service (logique métier)
                   ↕ IEntreprisesRepository (Port)
Infrastructure →  Repository → HTTP Client → Mapper
```

**Zod comme source de vérité unique** — les schémas vivent dans `packages/shared-types` et sont importés par les deux apps. Les types TypeScript sont inférés automatiquement, sans jamais être écrits à la main.

### Structure apps/backend

```
apps/backend/src/
├── config/                         # Variables d'environnement typées
├── common/
│   ├── filters/                    # Filtre global d'exceptions HTTP
│   └── interceptors/               # Envelope { data, success, timestamp }
└── modules/entreprises/
    ├── domain/
    │   ├── entreprise.entity.ts    # Entité pure (sans décorateur NestJS)
    │   └── ports/
    │       └── entreprises.repository.port.ts   # Interface (Port)
    ├── application/
    │   ├── entreprises.service.ts  # Logique métier
    │   └── dto/                    # DTOs de requête/réponse + validation
    ├── infrastructure/
    │   ├── http-clients/
    │   │   ├── recherche-entreprises.client.ts  # API data.gouv.fr
    │   │   └── datagouv-mcp.client.ts           # Serveur MCP officiel
    │   ├── repositories/
    │   │   └── entreprises-api.repository.ts    # Adaptateur du Port
    │   └── mappers/
    │       └── entreprise-api.mapper.ts         # API brute → Entité
    ├── presentation/
    │   └── entreprises.controller.ts            # Routes HTTP
    └── __tests__/
        ├── unit/                   # Service, Mapper, Controller, Entity
        └── integration/            # Repository
```

### Structure apps/frontend

```
apps/frontend/src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Header, footer, QueryProvider
│   └── page.tsx                # Page principale
├── features/entreprises/
│   ├── types/
│   │   └── entreprise.schemas.ts   # Re-export depuis @mcpgouv/shared-types
│   ├── services/
│   │   └── entreprises.api.service.ts  # Appels axios + validation Zod
│   ├── hooks/
│   │   └── useEntreprises.ts   # useRecentEntreprises, useSearchEntreprises...
│   └── components/
│       ├── EntrepriseCard.tsx   # Carte unitaire avec badge d'ancienneté
│       ├── EntreprisesList.tsx  # Grille + pagination
│       ├── SearchFilters.tsx    # Filtres période / département / NAF
│       └── StatsPanel.tsx       # KPIs (créations, moyenne/jour, période)
└── providers/
    └── query-provider.tsx      # QueryClient singleton (TanStack Query)
```

### Package @mcpgouv/shared-types

Source de vérité partagée entre le backend et le frontend.

```typescript
// packages/shared-types/src/index.ts
import { z } from 'zod';

export const EntrepriseSchema = z.object({ ... });
export type Entreprise = z.infer<typeof EntrepriseSchema>; // type inféré, pas écrit à la main

// Importé dans les deux apps :
// import { Entreprise, EntrepriseSchema } from '@mcpgouv/shared-types';
```

Si un champ change côté backend, TypeScript le signale immédiatement côté frontend — sans lancer les tests.

## Sources de données

### 1. API Recherche d'entreprises (principale)
- URL : `https://recherche-entreprises.api.gouv.fr`
- Accès : public, sans clé API
- Données : SIRENE (INSEE) + RNE
- Paramètres clés : `date_creation_min/max`, `departement`, `etat_administratif`, `activite_principale`

### 2. Serveur MCP data.gouv.fr (secondaire)
- URL : `https://mcp.data.gouv.fr/mcp`
- Protocole : JSON-RPC 2.0 / Streamable HTTP (gestion de session `Mcp-Session-Id`)
- Accès : public, sans clé API
- Outils : `search_datasets`, `query_resource_data`, `get_dataservice_info`, `get_dataservice_openapi_spec`...
- Injecté via `DatagouvMcpClient` dans n'importe quel service NestJS

## Endpoints backend

| Méthode | Route | Paramètres clés | Description |
|---|---|---|---|
| GET | `/api/entreprises/recentes` | `days`, `page`, `perPage`, `departement` | Créations récentes |
| GET | `/api/entreprises/search` | `q`, `dateCreationMin/Max`, `departement` | Recherche filtrée |
| GET | `/api/entreprises/stats` | `days` | Statistiques de créations |
| GET | `/api/entreprises/:siren` | — | Détail par SIREN |

Documentation Swagger : `http://localhost:3001/api/docs`

## Installation & démarrage

### Prérequis

```bash
node -v   # >= 20
pnpm -v   # >= 9  (npm install -g pnpm)
```

### Démarrage complet (recommandé)

```bash
git clone ...
cd mcpgouv

# Copier les fichiers d'environnement
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local

# Installer toutes les dépendances en une commande
pnpm install

# Démarrer backend + frontend en parallèle
pnpm dev
# → Backend  : http://localhost:3001
# → Frontend : http://localhost:3000
# → Swagger  : http://localhost:3001/api/docs
```

### Commandes disponibles depuis la racine

```bash
pnpm dev              # backend + frontend en parallèle (avec logs colorés)
pnpm build            # build dans le bon ordre : shared-types → apps
pnpm test             # tous les tests Jest
pnpm test:unit        # tests unitaires uniquement
pnpm test:cov         # rapport de couverture
pnpm lint             # lint les deux apps
pnpm clean            # supprime dist/, .next/, coverage/, .turbo/
```

### Démarrage individuel (sans Turborepo)

```bash
# Backend seul
cd apps/backend && pnpm start:dev

# Frontend seul
cd apps/frontend && pnpm dev
```

## Variables d'environnement

### apps/backend/.env

```env
PORT=3001
NODE_ENV=development
RECHERCHE_ENTREPRISES_BASE_URL=https://recherche-entreprises.api.gouv.fr
DATAGOUV_MCP_URL=https://mcp.data.gouv.fr/mcp
FRONTEND_URL=http://localhost:3000
```

### apps/frontend/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Tests

```bash
pnpm test             # tous les tests depuis la racine
pnpm test:unit        # unitaires uniquement
pnpm test:cov         # avec rapport de couverture HTML dans apps/backend/coverage/
```

Couverture du backend :

| Fichier | Ce qui est testé |
|---|---|
| `entreprise.entity.spec.ts` | `estActive`, `dateCreationISO`, `ancienneteJours` |
| `entreprise-api.mapper.spec.ts` | `toEntity()`, `toPaginated()`, valeurs nullables |
| `entreprises.service.spec.ts` | `search`, `findRecent`, `findBySiren`, `getStats` |
| `entreprises.controller.spec.ts` | Mapping DTOs, délégation, `NotFoundException` |
| `entreprises-api.repository.spec.ts` | Conversion filtres, plages de dates, SIREN |

## Utiliser le client MCP dans un service

```typescript
@Injectable()
class MonService {
  constructor(private readonly mcp: DatagouvMcpClient) {}

  async exemple() {
    // Rechercher des jeux de données sur data.gouv.fr
    const datasets = await this.mcp.searchDatasets('sirene entreprises');

    // Interroger directement des données tabulaires SIRENE
    const data = await this.mcp.queryResourceData(
      'entreprises créées en 2024 en Île-de-France',
      '<resource_id_sirene>',
    );

    // Récupérer la spec OpenAPI d'un dataservice
    const spec = await this.mcp.getDataserviceOpenApiSpec('<dataservice_id>');
  }
}
```
