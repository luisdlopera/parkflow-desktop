export type SearchType = 
  | 'VEHICLE'
  | 'TICKET'
  | 'CLIENT'
  | 'USER'
  | 'INVOICE'
  | 'RESERVATION'
  | 'PAYMENT'
  | 'INCIDENT'
  | 'ACTION';

export interface SearchResult {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string;
  actionUrl: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  query: string;
  results: Record<SearchType, SearchResult[]>;
  processingTimeMs: number;
}
