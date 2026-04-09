'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Stethoscope, Code2, Utensils, Wrench, Briefcase, Truck, Users, ShieldCheck } from 'lucide-react';
import type { RecentEntreprisesParams } from '../types/entreprise.types';

// ─────────────────────────────────────────────
// Mapping métiers → codes NAF (nomenclature INSEE)
// ─────────────────────────────────────────────

interface Metier {
  label: string;
  naf: string;
  tags: string[]; // termes de recherche alternatifs
  categorie: string;
}

const METIERS: Metier[] = [
  // ── Santé ──────────────────────────────────
  { label: 'Médecin généraliste', naf: '86.21Z', tags: ['médecin', 'généraliste', 'docteur'], categorie: 'Santé' },
  { label: 'Chirurgien', naf: '86.22B', tags: ['chirurgie', 'chirurgien'], categorie: 'Santé' },
  { label: 'Gynécologue', naf: '86.22C', tags: ['gynécologie', 'obstétrique'], categorie: 'Santé' },
  { label: 'Ophtalmologue', naf: '86.22A', tags: ['ophtalmologie', 'oculiste', 'yeux'], categorie: 'Santé' },
  { label: 'Dentiste', naf: '86.23Z', tags: ['dentiste', 'chirurgien-dentiste', 'dentaire'], categorie: 'Santé' },
  { label: 'Orthoptiste', naf: '86.90E', tags: ['orthoptie', 'vision', 'rééducation visuelle'], categorie: 'Santé' },
  { label: 'Orthophoniste', naf: '86.90E', tags: ['orthophonie', 'langage', 'rééducation'], categorie: 'Santé' },
  { label: 'Kinésithérapeute', naf: '86.90E', tags: ['kiné', 'kinésithérapie', 'masseur'], categorie: 'Santé' },
  { label: 'Ergothérapeute', naf: '86.90E', tags: ['ergothérapie', 'rééducation'], categorie: 'Santé' },
  { label: 'Psychomotricien', naf: '86.90E', tags: ['psychomotricité', 'rééducation'], categorie: 'Santé' },
  { label: 'Pédicure-podologue', naf: '86.90E', tags: ['podologie', 'pédicure', 'pied'], categorie: 'Santé' },
  { label: 'Infirmier', naf: '86.90D', tags: ['infirmière', 'soins infirmiers', 'IDE'], categorie: 'Santé' },
  { label: 'Sage-femme', naf: '86.90D', tags: ['maïeutique', 'accouchement', 'maternité'], categorie: 'Santé' },
  { label: 'Psychologue', naf: '86.90F', tags: ['psychologie', 'psy', 'thérapie'], categorie: 'Santé' },
  { label: 'Ostéopathe', naf: '86.90F', tags: ['ostéopathie', 'manipulation'], categorie: 'Santé' },
  { label: 'Diététicien', naf: '86.90F', tags: ['diététique', 'nutrition', 'nutritionniste'], categorie: 'Santé' },
  { label: 'Laboratoire d\'analyses médicales', naf: '86.90B', tags: ['labo', 'biologie', 'analyses'], categorie: 'Santé' },
  { label: 'Pharmacie', naf: '47.73Z', tags: ['pharmacien', 'médicaments'], categorie: 'Santé' },
  { label: 'Ambulance', naf: '86.90A', tags: ['ambulancier', 'transport médical', 'SAMU'], categorie: 'Santé' },
  { label: 'Opticien', naf: '47.78A', tags: ['lunettes', 'optique', 'verres'], categorie: 'Santé' },
  { label: 'Audioprothésiste', naf: '47.78A', tags: ['audition', 'prothèse auditive', 'sonotone'], categorie: 'Santé' },
  { label: 'Vétérinaire', naf: '75.00Z', tags: ['vétérinaire', 'animaux', 'clinique vétérinaire'], categorie: 'Santé' },

  // ── Tech / Numérique ───────────────────────
  { label: 'Développeur logiciel', naf: '62.01Z', tags: ['développeur', 'programmeur', 'software', 'code', 'dev'], categorie: 'Tech' },
  { label: 'Consultant IT', naf: '62.02A', tags: ['consultant informatique', 'ESN', 'SSII', 'IT'], categorie: 'Tech' },
  { label: 'Data scientist / Analyste', naf: '62.02A', tags: ['data', 'intelligence artificielle', 'IA', 'machine learning'], categorie: 'Tech' },
  { label: 'Cybersécurité', naf: '62.09Z', tags: ['sécurité informatique', 'hacking', 'pentest'], categorie: 'Tech' },
  { label: 'Designer UX/UI', naf: '74.10Z', tags: ['design', 'UX', 'UI', 'graphiste', 'webdesign'], categorie: 'Tech' },
  { label: 'Agence web', naf: '63.12Z', tags: ['site web', 'webmaster', 'création de site'], categorie: 'Tech' },

  // ── Conseil / Services aux entreprises ────
  { label: 'Avocat', naf: '69.10Z', tags: ['droit', 'juriste', 'cabinet avocat'], categorie: 'Conseil' },
  { label: 'Expert-comptable', naf: '69.20Z', tags: ['comptable', 'comptabilité', 'bilan'], categorie: 'Conseil' },
  { label: 'Notaire', naf: '69.10Z', tags: ['notariat', 'acte notarié'], categorie: 'Conseil' },
  { label: 'Architecte', naf: '71.11Z', tags: ['architecture', 'maîtrise d\'œuvre', 'plans'], categorie: 'Conseil' },
  { label: 'Consultant en management', naf: '70.22Z', tags: ['conseil', 'management', 'stratégie'], categorie: 'Conseil' },
  { label: 'Coach / Formateur', naf: '85.59B', tags: ['coaching', 'formation', 'développement personnel'], categorie: 'Conseil' },
  { label: 'Ressources humaines', naf: '78.10Z', tags: ['RH', 'recrutement', 'DRH'], categorie: 'Conseil' },
  { label: 'Agent immobilier', naf: '68.31Z', tags: ['immobilier', 'agence immobilière', 'transaction'], categorie: 'Conseil' },
  { label: 'Assurance', naf: '65.12Z', tags: ['assureur', 'courtier assurance', 'agent assurance'], categorie: 'Conseil' },
  { label: 'Géomètre-expert', naf: '71.12B', tags: ['géomètre', 'foncier', 'topographie'], categorie: 'Conseil' },

  // ── Commerce / Restauration ────────────────
  { label: 'Restaurant', naf: '56.10A', tags: ['restauration', 'cuisinier', 'chef', 'bistrot', 'brasserie'], categorie: 'Commerce' },
  { label: 'Restauration rapide', naf: '56.10C', tags: ['fast food', 'snack', 'kebab', 'burger'], categorie: 'Commerce' },
  { label: 'Bar / Café', naf: '56.30Z', tags: ['bar', 'café', 'débit de boisson', 'pub'], categorie: 'Commerce' },
  { label: 'Boulangerie-Pâtisserie', naf: '47.24Z', tags: ['boulanger', 'pâtissier', 'pain', 'viennoiserie'], categorie: 'Commerce' },
  { label: 'Boucherie-Charcuterie', naf: '47.22Z', tags: ['boucher', 'charcutier', 'viande'], categorie: 'Commerce' },
  { label: 'Épicerie / Alimentation', naf: '47.11B', tags: ['épicerie', 'alimentation', 'superette', 'épicier'], categorie: 'Commerce' },
  { label: 'Fleuriste', naf: '47.76Z', tags: ['fleurs', 'fleuriste', 'plantes'], categorie: 'Commerce' },
  { label: 'Librairie', naf: '47.61Z', tags: ['libraire', 'livres', 'librairie'], categorie: 'Commerce' },
  { label: 'Prêt-à-porter / Mode', naf: '47.71Z', tags: ['vêtements', 'mode', 'boutique', 'textile'], categorie: 'Commerce' },

  // ── Artisanat / BTP ────────────────────────
  { label: 'Plombier', naf: '43.22A', tags: ['plomberie', 'chauffagiste', 'sanitaire'], categorie: 'Artisanat' },
  { label: 'Électricien', naf: '43.21A', tags: ['électricité', 'installation électrique', 'électrotechnique'], categorie: 'Artisanat' },
  { label: 'Maçon', naf: '43.99B', tags: ['maçonnerie', 'béton', 'gros œuvre'], categorie: 'Artisanat' },
  { label: 'Peintre en bâtiment', naf: '43.34Z', tags: ['peinture', 'ravalement', 'décorateur'], categorie: 'Artisanat' },
  { label: 'Charpentier', naf: '43.91A', tags: ['charpente', 'bois', 'toiture'], categorie: 'Artisanat' },
  { label: 'Menuisier', naf: '43.32A', tags: ['menuiserie', 'portes', 'fenêtres', 'bois'], categorie: 'Artisanat' },
  { label: 'Carreleur', naf: '43.33Z', tags: ['carrelage', 'sol', 'revêtement'], categorie: 'Artisanat' },
  { label: 'Construction de maisons', naf: '41.20A', tags: ['constructeur', 'maison individuelle', 'promoteur'], categorie: 'Artisanat' },
  { label: 'Serrurier', naf: '43.29A', tags: ['serrurerie', 'sécurité', 'métallerie'], categorie: 'Artisanat' },
  { label: 'Couvreur', naf: '43.91B', tags: ['couverture', 'toiture', 'ardoise', 'tuile'], categorie: 'Artisanat' },

  // ── Beauté / Bien-être ─────────────────────
  { label: 'Coiffeur', naf: '96.02A', tags: ['coiffure', 'salon coiffure', 'barbier'], categorie: 'Beauté' },
  { label: 'Esthéticienne', naf: '96.02B', tags: ['esthétique', 'beauté', 'épilation', 'spa'], categorie: 'Beauté' },
  { label: 'Tatoueur', naf: '96.09Z', tags: ['tatouage', 'piercing'], categorie: 'Beauté' },
  { label: 'Coach sportif', naf: '85.51Z', tags: ['sport', 'fitness', 'salle de sport', 'personal trainer'], categorie: 'Beauté' },
  { label: 'Yoga / Pilates', naf: '85.51Z', tags: ['yoga', 'pilates', 'bien-être', 'méditation'], categorie: 'Beauté' },

  // ── Transport / Logistique ─────────────────
  { label: 'Taxi / VTC', naf: '49.32Z', tags: ['taxi', 'VTC', 'Uber', 'chauffeur'], categorie: 'Transport' },
  { label: 'Transporteur routier', naf: '49.41A', tags: ['camion', 'fret', 'transport marchandises', 'livreur'], categorie: 'Transport' },
  { label: 'Déménageur', naf: '49.42Z', tags: ['déménagement', 'déménageur'], categorie: 'Transport' },
  { label: 'Coursier / Livraison', naf: '53.20Z', tags: ['coursier', 'livraison', 'vélo', 'moto'], categorie: 'Transport' },

  // ── Enseignement ───────────────────────────
  { label: 'Auto-école', naf: '85.53Z', tags: ['auto-école', 'conduite', 'permis'], categorie: 'Enseignement' },
  { label: 'Soutien scolaire', naf: '85.59B', tags: ['cours particuliers', 'soutien scolaire', 'tutorat'], categorie: 'Enseignement' },
  { label: 'Crèche / Garde d\'enfants', naf: '88.91A', tags: ['crèche', 'nounou', 'assistante maternelle', 'garde enfants'], categorie: 'Enseignement' },
];

const CATEGORIES_ICONS: Record<string, React.ElementType> = {
  Santé: Stethoscope,
  Tech: Code2,
  Commerce: Utensils,
  Artisanat: Wrench,
  Conseil: Briefcase,
  Transport: Truck,
};

// ─────────────────────────────────────────────
// Composant MetierSearch — autocomplete
// ─────────────────────────────────────────────

interface MetierSearchProps {
  value: string; // code NAF sélectionné
  onChange: (naf: string, label: string) => void;
}

function MetierSearch({ value, onChange }: MetierSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = query.length >= 2
    ? METIERS.filter((m) => {
        const q = query.toLowerCase();
        return (
          m.label.toLowerCase().includes(q) ||
          m.naf.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
        );
      }).slice(0, 8)
    : [];

  // Fermer le dropdown si clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (metier: Metier) => {
    setSelectedLabel(metier.label);
    setQuery('');
    setOpen(false);
    onChange(metier.naf, metier.label);
  };

  const handleClear = () => {
    setSelectedLabel('');
    setQuery('');
    onChange('', '');
  };

  const groupedSuggestions = suggestions.reduce<Record<string, Metier[]>>((acc, m) => {
    if (!acc[m.categorie]) acc[m.categorie] = [];
    acc[m.categorie].push(m);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Métier / activité
      </label>

      {selectedLabel ? (
        // Badge de sélection
        <div className="flex items-center gap-2 px-3 py-2 bg-[#003189]/10 border border-[#003189]/30 rounded-lg">
          <span className="text-sm font-medium text-[#003189] flex-1">{selectedLabel}</span>
          <span className="text-xs text-gray-400 font-mono">{value}</span>
          <button onClick={handleClear} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Ex : orthoptiste, plombier, avocat..."
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003189]"
          />
        </div>
      )}

      {/* Dropdown suggestions */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {Object.entries(groupedSuggestions).map(([cat, items]) => {
            const Icon = CATEGORIES_ICONS[cat];
            return (
              <div key={cat}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 sticky top-0">
                  {Icon && <Icon size={12} className="text-gray-400" />}
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{cat}</span>
                </div>
                {items.map((m) => (
                  <button
                    key={`${m.naf}-${m.label}`}
                    onMouseDown={() => handleSelect(m)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#003189]/5 text-left transition-colors"
                  >
                    <span className="text-sm text-gray-800">{m.label}</span>
                    <span className="text-xs font-mono text-gray-400 shrink-0 ml-2">{m.naf}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {open && query.length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm text-gray-400 text-center">
          Aucun métier trouvé pour « {query} »
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const DEPARTEMENTS = [
  { code: '', label: 'Tous les départements' },
  { code: '75', label: '75 — Paris' },
  { code: '69', label: '69 — Rhône' },
  { code: '13', label: '13 — Bouches-du-Rhône' },
  { code: '59', label: '59 — Nord' },
  { code: '33', label: '33 — Gironde' },
  { code: '31', label: '31 — Haute-Garonne' },
  { code: '67', label: '67 — Bas-Rhin' },
  { code: '06', label: '06 — Alpes-Maritimes' },
  { code: '44', label: '44 — Loire-Atlantique' },
  { code: '76', label: '76 — Seine-Maritime' },
  { code: '34', label: '34 — Hérault' },
  { code: '35', label: '35 — Ille-et-Vilaine' },
  { code: '38', label: '38 — Isère' },
  { code: '57', label: '57 — Moselle' },
];

const PERIODES = [
  { days: 7, label: '7 derniers jours' },
  { days: 30, label: '30 derniers jours' },
  { days: 90, label: '3 derniers mois' },
  { days: 180, label: '6 derniers mois' },
  { days: 365, label: '12 derniers mois' },
];

// ─────────────────────────────────────────────
// Tranches d'effectif salarié (codes INSEE)
// Regroupées en paliers métier pour la prospection
// ─────────────────────────────────────────────

const TRANCHES_EFFECTIF = [
  { code: '', label: 'Toutes tailles' },
  { code: 'NN,00', label: 'Sans salarié (indépendant)', description: 'Auto-entrepreneurs, freelances' },
  { code: '01,02', label: '1 à 5 salariés', description: 'TPE' },
  { code: '03,11', label: '6 à 19 salariés', description: 'Petite entreprise' },
  { code: '12,21', label: '20 à 99 salariés', description: 'PME' },
  { code: '22,31,32', label: '100 à 499 salariés', description: 'Grande PME' },
  { code: '41,42,51,52,53', label: '500+ salariés', description: 'ETI / Grande entreprise' },
];

// ─────────────────────────────────────────────
// États administratifs
// ─────────────────────────────────────────────

const ETATS_ADMINISTRATIFS = [
  { code: '', label: 'Tous les états' },
  { code: 'A', label: 'Active' },
  { code: 'C', label: 'Cessée' },
];

// ─────────────────────────────────────────────
// Composant principal SearchFilters
// ─────────────────────────────────────────────

interface SearchFiltersProps {
  onChange: (params: RecentEntreprisesParams) => void;
  isLoading?: boolean;
}

export function SearchFilters({ onChange, isLoading }: SearchFiltersProps) {
  const [days, setDays] = useState(30);
  const [departement, setDepartement] = useState('');
  const [activiteNaf, setActiviteNaf] = useState('');
  const [trancheEffectif, setTrancheEffectif] = useState('');
  const [etatAdministratif, setEtatAdministratif] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const applyFilters = useCallback(
    (newDays = days, newDept = departement, newNaf = activiteNaf, newTranche = trancheEffectif, newEtat = etatAdministratif) => {
      onChange({
        days: newDays,
        departement: newDept || undefined,
        activitePrincipale: newNaf || undefined,
        trancheEffectifSalarie: newTranche || undefined,
        etatAdministratif: (newEtat === 'A' || newEtat === 'C') ? newEtat : undefined,
        page: 1,
      });
    },
    [days, departement, activiteNaf, trancheEffectif, etatAdministratif, onChange],
  );

  const handleReset = () => {
    setDays(30);
    setDepartement('');
    setActiviteNaf('');
    setTrancheEffectif('');
    setEtatAdministratif('');
    onChange({ days: 30, page: 1 });
  };

  const hasActiveFilters = departement !== '' || activiteNaf !== '' || trancheEffectif !== '' || etatAdministratif !== '' || days !== 30;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      {/* Période */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Période de création
        </label>
        <div className="flex flex-wrap gap-2">
          {PERIODES.map((p) => (
            <button
              key={p.days}
              onClick={() => { setDays(p.days); applyFilters(p.days, departement, activiteNaf, trancheEffectif, etatAdministratif); }}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                days === p.days
                  ? 'bg-[#003189] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle filtres avancés */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-[#003189] font-medium mb-3"
      >
        <SlidersHorizontal size={14} />
        {showAdvanced ? 'Masquer les filtres' : 'Filtres avancés'}
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Département */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Département
            </label>
            <select
              value={departement}
              onChange={(e) => {
                setDepartement(e.target.value);
                applyFilters(days, e.target.value, activiteNaf, trancheEffectif, etatAdministratif);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003189]"
            >
              {DEPARTEMENTS.map((d) => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Métier avec autocomplete */}
          <MetierSearch
            value={activiteNaf}
            onChange={(naf) => {
              setActiviteNaf(naf);
              applyFilters(days, departement, naf, trancheEffectif, etatAdministratif);
            }}
          />

          {/* Taille d'entreprise (tranche d'effectif) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users size={13} className="inline mr-1 -mt-0.5 text-gray-400" />
              Taille d&apos;entreprise
            </label>
            <select
              value={trancheEffectif}
              onChange={(e) => {
                setTrancheEffectif(e.target.value);
                applyFilters(days, departement, activiteNaf, e.target.value, etatAdministratif);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003189]"
            >
              {TRANCHES_EFFECTIF.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* État administratif */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <ShieldCheck size={13} className="inline mr-1 -mt-0.5 text-gray-400" />
              État administratif
            </label>
            <select
              value={etatAdministratif}
              onChange={(e) => {
                setEtatAdministratif(e.target.value);
                applyFilters(days, departement, activiteNaf, trancheEffectif, e.target.value);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003189]"
            >
              {ETATS_ADMINISTRATIFS.map((ea) => (
                <option key={ea.code} value={ea.code}>
                  {ea.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Reset */}
      {hasActiveFilters && (
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <X size={12} />
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Barre de recherche libre
// ─────────────────────────────────────────────

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  placeholder = 'Rechercher une entreprise, SIREN, dirigeant...',
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003189] bg-white"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#003189] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors"
      >
        Rechercher
      </button>
    </form>
  );
}
