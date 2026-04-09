import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Réponse brute d'un outil MCP (tools/call).
 */
interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

interface McpJsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

/**
 * Client HTTP pour le serveur MCP officiel de data.gouv.fr.
 *
 * Protocole : Streamable HTTP (JSON-RPC 2.0 over POST).
 * Endpoint   : https://mcp.data.gouv.fr/mcp
 * Authentification : aucune (accès public en lecture)
 *
 * Workflow :
 *   1. POST initialize  → obtenir Mcp-Session-Id
 *   2. POST tools/call  → appeler un outil avec le session ID en header
 */
@Injectable()
export class DatagouvMcpClient {
  private readonly logger = new Logger(DatagouvMcpClient.name);
  private readonly http: AxiosInstance;
  private sessionId: string | null = null;
  private requestId = 0;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('api.datagouvMcpUrl')!;

    this.http = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      timeout: 30_000,
    });
  }

  // ─────────────────────────────────────────────
  // Session management
  // ─────────────────────────────────────────────

  /**
   * Initialise la session MCP et stocke le session ID.
   * Appelé automatiquement avant le premier outil si pas encore initialisé.
   */
  async initialize(): Promise<void> {
    if (this.sessionId) return;

    const response = await this.http.post<
      McpJsonRpcResponse<{ protocolVersion: string; capabilities: object }>
    >('', {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'api-entreprises', version: '1.0.0' },
      },
    });

    const sessionId = response.headers['mcp-session-id'] as string | undefined;
    if (sessionId) {
      this.sessionId = sessionId;
      this.logger.log(`Session MCP initialisée : ${sessionId}`);
    }
  }

  // ─────────────────────────────────────────────
  // Outils MCP exposés
  // ─────────────────────────────────────────────

  /**
   * Recherche des jeux de données sur data.gouv.fr.
   */
  async searchDatasets(query: string, pageSize = 10): Promise<string> {
    return this.callTool('search_datasets', { query, page_size: pageSize });
  }

  /**
   * Interroge les données d'une ressource tabulaire via l'API Tabulaire.
   * Utile pour interroger SIRENE directement.
   */
  async queryResourceData(
    question: string,
    resourceId: string,
    page = 1,
    pageSize = 20,
  ): Promise<string> {
    return this.callTool('query_resource_data', {
      question,
      resource_id: resourceId,
      page,
      page_size: pageSize,
    });
  }

  /**
   * Récupère des informations sur un dataservice (ex. API Sirene).
   */
  async getDataserviceInfo(dataserviceId: string): Promise<string> {
    return this.callTool('get_dataservice_info', {
      dataservice_id: dataserviceId,
    });
  }

  /**
   * Récupère la spec OpenAPI d'un dataservice.
   */
  async getDataserviceOpenApiSpec(dataserviceId: string): Promise<string> {
    return this.callTool('get_dataservice_openapi_spec', {
      dataservice_id: dataserviceId,
    });
  }

  // ─────────────────────────────────────────────
  // Méthode privée d'appel générique
  // ─────────────────────────────────────────────

  private async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    await this.initialize();

    const headers: Record<string, string> = {};
    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    try {
      const response = await this.http.post<McpJsonRpcResponse<McpToolResult>>(
        '',
        {
          jsonrpc: '2.0',
          id: this.nextId(),
          method: 'tools/call',
          params: { name, arguments: args },
        },
        { headers },
      );

      // Gestion SSE : si la réponse est text/event-stream, parser le texte
      const data = response.data;

      if (data.error) {
        this.logger.error(`Erreur MCP tool ${name}: ${data.error.message}`);
        throw new Error(`MCP error: ${data.error.message}`);
      }

      const result = data.result;
      if (!result || result.isError) {
        throw new Error(`L'outil MCP ${name} a retourné une erreur`);
      }

      return result.content.map((c) => c.text).join('\n');
    } catch (error) {
      this.logger.error(`Échec appel outil MCP ${name}`, error);
      throw error;
    }
  }

  private nextId(): number {
    return ++this.requestId;
  }
}
