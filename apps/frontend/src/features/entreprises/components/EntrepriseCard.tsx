'use client';

import { Building2, MapPin, Calendar, Tag, ExternalLink, User, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Entreprise } from '../types/entreprise.types';

interface EntrepriseCardProps {
  entreprise: Entreprise;
  onClick?: (entreprise: Entreprise) => void;
}

function getAncienneteBadge(days: number): { label: string; className: string } {
  if (days <= 7)  return { label: 'Cette semaine', className: 'bg-green-100 text-green-700' };
  if (days <= 30) return { label: 'Ce mois',       className: 'bg-blue-100 text-blue-700' };
  if (days <= 90) return { label: '< 3 mois',      className: 'bg-indigo-100 text-indigo-700' };
  if (days <= 180)return { label: '< 6 mois',      className: 'bg-purple-100 text-purple-700' };
  return             { label: '< 1 an',             className: 'bg-gray-100 text-gray-600' };
}

function formatDate(dateStr: string): string {
  try { return format(parseISO(dateStr), 'd MMMM yyyy', { locale: fr }); }
  catch { return dateStr; }
}

export function EntrepriseCard({ entreprise, onClick }: EntrepriseCardProps) {
  const badge = getAncienneteBadge(entreprise.ancienneteJours);

  // Premier dirigeant personne physique (le plus utile pour la prospection)
  const dirigeantPrincipal = entreprise.dirigeants?.find(d => d.estPersonnePhysique)
    ?? entreprise.dirigeants?.[0];

  const nomDirigeant = dirigeantPrincipal
    ? [dirigeantPrincipal.prenom, dirigeantPrincipal.nom].filter(Boolean).join(' ')
    : null;

  // URL de recherche Google pour trouver le contact
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${nomDirigeant ?? entreprise.nomRaisonSociale} ${entreprise.siege?.libelleCommune ?? ''}`
  )}`;

  // URL Pappers pour données enrichies (téléphone, email, capital...)
  const pappersUrl = `https://www.pappers.fr/entreprise/${entreprise.siren}`;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(entreprise)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(entreprise)}
      className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-[#003189]/30' : ''
      }`}
    >
      {/* En-tête : nom + badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#003189]/10 rounded-lg flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-[#003189]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2">
              {entreprise.nomRaisonSociale === 'ND'
                ? <span className="text-gray-400 italic">Non diffusible</span>
                : entreprise.nomRaisonSociale}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">SIREN {entreprise.siren}</p>
          </div>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Dirigeant — clé pour la prospection */}
      {nomDirigeant && (
        <div className="flex items-center gap-1.5 mb-2">
          <User size={13} className="text-[#003189]/60 shrink-0" />
          <span className="text-sm font-medium text-[#003189]">{nomDirigeant}</span>
          {dirigeantPrincipal?.qualite && (
            <span className="text-xs text-gray-400">· {dirigeantPrincipal.qualite}</span>
          )}
        </div>
      )}

      {/* Activité */}
      <div className="flex items-center gap-1.5 mb-2">
        <Tag size={13} className="text-gray-400 shrink-0" />
        <span className="text-sm text-gray-600 truncate">{entreprise.libelleActivitePrincipale}</span>
        <span className="text-xs text-gray-400 shrink-0">({entreprise.activitePrincipale})</span>
      </div>

      {/* Adresse complète */}
      {entreprise.siege?.libelleCommune && (
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin size={13} className="text-gray-400 shrink-0" />
          <span className="text-sm text-gray-600">
            {entreprise.siege.adresse && (
              <span className="text-gray-500">{entreprise.siege.adresse} · </span>
            )}
            {entreprise.siege.libelleCommune}
            {entreprise.siege.codePostal && ` (${entreprise.siege.codePostal})`}
          </span>
        </div>
      )}

      {/* Date de création */}
      <div className="flex items-center gap-1.5 mb-4">
        <Calendar size={13} className="text-gray-400 shrink-0" />
        <span className="text-sm text-gray-600">
          Créée le <span className="font-medium text-gray-800">{formatDate(entreprise.dateCreation)}</span>
        </span>
      </div>

      {/* ── Boutons de prospection ── */}
      <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-2">

        {/* Recherche Google du dirigeant */}
        <a
          href={googleSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
          title="Chercher le contact sur Google"
        >
          <Search size={12} />
          Trouver le contact
        </a>

        {/* Pappers — données enrichies */}
        <a
          href={pappersUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
          title="Voir sur Pappers (capital, dirigeants, bilans...)"
        >
          <ExternalLink size={12} />
          Pappers
        </a>

        {/* Annuaire officiel */}
        <a
          href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${entreprise.siren}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <ExternalLink size={12} />
          Annuaire
        </a>
      </div>
    </div>
  );
}
