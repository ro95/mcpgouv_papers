'use client';

import { X, Globe, Mail, Phone, TrendingUp, Users, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import type { Entreprise } from '../types/entreprise.types';
import { useEnrichment } from '../hooks/useEntreprises';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatCurrency(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPhone(phone: string | null): string {
  if (!phone) return '—';
  // Format français : 01 23 45 67 89
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
}

// ─────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────

interface EntrepriseDetailPanelProps {
  entreprise: Entreprise;
  onClose: () => void;
}

export function EntrepriseDetailPanel({ entreprise, onClose }: EntrepriseDetailPanelProps) {
  const { data: enrichment, isLoading, isError } = useEnrichment(entreprise.siren);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panneau latéral */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {entreprise.nomRaisonSociale}
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">SIREN {entreprise.siren}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* ── Section Pappers : Contacts ── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Coordonnées
            </h3>

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                <Loader2 size={16} className="animate-spin" />
                Chargement des données Pappers...
              </div>
            )}

            {isError && (
              <div className="flex items-center gap-2 text-sm text-red-500 py-3">
                <AlertCircle size={16} />
                Erreur lors du chargement
              </div>
            )}

            {enrichment && !enrichment.disponible && (
              <div className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                {enrichment.erreur ?? 'Enrichissement Pappers indisponible.'}
              </div>
            )}

            {enrichment?.disponible && (
              <div className="space-y-2.5">
                {/* Site web */}
                <div className="flex items-center gap-3">
                  <Globe size={16} className="text-blue-500 shrink-0" />
                  {enrichment.siteWeb ? (
                    <a
                      href={enrichment.siteWeb.startsWith('http') ? enrichment.siteWeb : `https://${enrichment.siteWeb}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate"
                    >
                      {enrichment.siteWeb}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Pas de site internet</span>
                  )}
                </div>

                {/* Email */}
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-green-500 shrink-0" />
                  {enrichment.email ? (
                    <a
                      href={`mailto:${enrichment.email}`}
                      className="text-sm text-green-700 hover:underline"
                    >
                      {enrichment.email}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Email non disponible</span>
                  )}
                </div>

                {/* Téléphone */}
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-purple-500 shrink-0" />
                  {enrichment.telephone ? (
                    <a
                      href={`tel:${enrichment.telephone}`}
                      className="text-sm text-purple-700 hover:underline font-mono"
                    >
                      {formatPhone(enrichment.telephone)}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Téléphone non disponible</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Section Pappers : Données financières ── */}
          {enrichment?.disponible && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Données financières
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Chiffre d'affaires */}
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={14} className="text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">Chiffre d&apos;affaires</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(enrichment.chiffreAffaires)}
                  </p>
                </div>

                {/* Résultat */}
                <div className={`rounded-xl p-3 ${
                  enrichment.resultat != null && enrichment.resultat >= 0
                    ? 'bg-green-50'
                    : 'bg-red-50'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={14} className={
                      enrichment.resultat != null && enrichment.resultat >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    } />
                    <span className={`text-xs font-medium ${
                      enrichment.resultat != null && enrichment.resultat >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>Résultat net</span>
                  </div>
                  <p className={`text-lg font-bold ${
                    enrichment.resultat != null && enrichment.resultat >= 0
                      ? 'text-green-900'
                      : 'text-red-900'
                  }`}>
                    {formatCurrency(enrichment.resultat)}
                  </p>
                </div>

                {/* Effectifs */}
                <div className="bg-purple-50 rounded-xl p-3 col-span-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users size={14} className="text-purple-600" />
                    <span className="text-xs font-medium text-purple-600">Effectifs</span>
                  </div>
                  <p className="text-lg font-bold text-purple-900">
                    {enrichment.effectifs != null ? `${enrichment.effectifs} salarié(s)` : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Infos entreprise (données gouv) ── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Informations légales
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Activité</dt>
                <dd className="text-gray-900 text-right">{entreprise.libelleActivitePrincipale}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Code NAF</dt>
                <dd className="text-gray-900 font-mono">{entreprise.activitePrincipale}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Adresse</dt>
                <dd className="text-gray-900 text-right">
                  {entreprise.siege?.adresse ? `${entreprise.siege.adresse}, ` : ''}
                  {entreprise.siege?.libelleCommune}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Date de création</dt>
                <dd className="text-gray-900">{entreprise.dateCreation}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Établissements</dt>
                <dd className="text-gray-900">{entreprise.nombreEtablissementsOuverts} ouvert(s)</dd>
              </div>
            </dl>
          </div>

          {/* ── Liens externes ── */}
          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={`https://www.pappers.fr/entreprise/${entreprise.siren}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 px-3 py-2 rounded-lg font-medium transition-colors"
            >
              <ExternalLink size={12} />
              Fiche Pappers complète
            </a>
            <a
              href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${entreprise.siren}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg font-medium transition-colors"
            >
              <ExternalLink size={12} />
              Annuaire officiel
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
