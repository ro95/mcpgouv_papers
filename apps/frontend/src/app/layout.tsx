import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ouvertures d\'entreprises | data.gouv.fr',
  description:
    'Explorez les récentes créations d\'entreprises en France via les données ouvertes de data.gouv.fr (SIRENE).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <QueryProvider>
          {/* Header Marianne */}
          <header className="bg-[#003189] text-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight leading-none">
                  Entreprises.gouv
                </span>
                <span className="text-blue-300 text-xs">
                  Données ouvertes · data.gouv.fr
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs text-blue-300">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                API data.gouv.fr connectée
              </div>
            </div>
          </header>

          {/* Contenu principal */}
          <main className="min-h-screen">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white mt-12 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-400">
              <p>
                Données issues du répertoire SIRENE de l&apos;INSEE via{' '}
                <a
                  href="https://recherche-entreprises.api.gouv.fr"
                  className="text-[#003189] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  API Recherche d&apos;entreprises
                </a>{' '}
                et du serveur MCP{' '}
                <a
                  href="https://mcp.data.gouv.fr"
                  className="text-[#003189] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  data.gouv.fr
                </a>
              </p>
            </div>
          </footer>
        </QueryProvider>
      </body>
    </html>
  );
}
