export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  api: {
    rechercheEntreprisesBaseUrl:
      process.env.RECHERCHE_ENTREPRISES_BASE_URL ??
      'https://recherche-entreprises.api.gouv.fr',
    datagouvMcpUrl:
      process.env.DATAGOUV_MCP_URL ?? 'https://mcp.data.gouv.fr/mcp',
  },
  insee: {
    // Clé d'API unique — portail-api.insee.fr → Applications → Souscriptions → Clés d'API
    apiKey: process.env.INSEE_API_KEY ?? '',
  },
  pappers: {
    // Clé d'API Pappers — https://www.pappers.fr/api → Créer un compte (100 crédits offerts)
    apiKey: process.env.PAPPERS_API_KEY ?? '',
    baseUrl: process.env.PAPPERS_BASE_URL ?? 'https://api.pappers.fr/v2',
  },
});
