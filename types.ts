
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export interface IntelMessage {
  id: string;
  type: 'FLASH' | 'DATA' | 'NOTICE' | 'ALERT';
  time: string;
  content: string;
  highlight?: string;
}

export enum QuadrantType {
  MACRO = 'MACRO',
  INSTITUTIONAL = 'INSTITUTIONAL',
  TECHNICAL = 'TECHNICAL',
  AI = 'AI'
}
