export interface ClaimDraft {
  claimantName: string;
  deceasedName: string;
  relationship: string;
  bankName: string;
  accountNumber: string;
  amount: string;
  status: 'draft' | 'ready' | 'submitted';
}

export interface LogMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  timestamp: Date;
}

export enum AgentState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
  THINKING = 'thinking',
  ERROR = 'error'
}

export interface ToolCallResponse {
  functionResponses: {
    id: string;
    name: string;
    response: object;
  }
}
