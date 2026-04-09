'use client';

import { TrendingUp, Building2, CalendarDays, Loader2 } from 'lucide-react';
import { useEntreprisesStats } from '../hooks/useEntreprises';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StatsPanelProps {
  days?: number;
}

export function StatsPanel({ days = 30 }: StatsPanelProps) {
  const { data: stats, isLoading, isError } = useEntreprisesStats(days);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !stats) return null;

  const formatShortDate = (d: string) => {
    try {
      return format(parseISO(d), 'd MMM yyyy', { locale: fr });
    } catch {
      return d;
    }
  };

  const statCards = [
    {
      icon: Building2,
      label: `Créations sur ${stats.periodDays} jours`,
      value: stats.totalRecentCreations.toLocaleString('fr-FR'),
      color: 'text-[#003189]',
      bg: 'bg-[#003189]/10',
    },
    {
      icon: TrendingUp,
      label: 'Moyenne par jour',
      value: Math.round(stats.totalRecentCreations / stats.periodDays).toLocaleString('fr-FR'),
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      icon: CalendarDays,
      label: 'Période analysée',
      value: `${formatShortDate(stats.dateMin)} → ${formatShortDate(stats.dateMax)}`,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      small: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {statCards.map((s) => (
        <div
          key={s.label}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}>
              <s.icon size={16} className={s.color} />
            </div>
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
          <p className={`font-bold ${s.small ? 'text-base' : 'text-2xl'} text-gray-900`}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}
