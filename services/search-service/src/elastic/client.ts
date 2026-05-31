import { Client } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';

let esClientInstance: Client | null = null;

export function getEsClient(): Client {
  if (esClientInstance) return esClientInstance;
  const url = process.env['ELASTICSEARCH_URL'];
  const apiKey = process.env['ELASTICSEARCH_API_KEY'];
  if (!url || !apiKey) throw new Error('Missing ELASTICSEARCH_URL or ELASTICSEARCH_API_KEY');
  esClientInstance = new Client({ node: url, auth: { apiKey } });
  return esClientInstance;
}

export interface EsClientShim {
  search(params: estypes.SearchRequest): Promise<estypes.SearchResponse>;
  update(params: estypes.UpdateRequest & { doc_as_upsert?: boolean }): Promise<estypes.UpdateResponse>;
  indices: {
    exists(params: estypes.IndicesExistsRequest): Promise<boolean>;
    create(params: estypes.IndicesCreateRequest): Promise<estypes.IndicesCreateResponse>;
  };
}

// Convenience wrapper — tests mock this module wholesale via vi.mock.
export const esClient: EsClientShim = {
  search(params) {
    return getEsClient().search(params) as Promise<estypes.SearchResponse>;
  },
  update(params) {
    return getEsClient().update(params) as Promise<estypes.UpdateResponse>;
  },
  indices: {
    exists(params) {
      return getEsClient().indices.exists(params) as Promise<boolean>;
    },
    create(params) {
      return getEsClient().indices.create(params) as Promise<estypes.IndicesCreateResponse>;
    },
  },
};
