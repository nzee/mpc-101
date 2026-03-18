export interface ProtocolEvent {
  round: number;
  from_party: number;
  to_type: 'broadcast' | 'private';
  to_parties: number[];
  bytes: number;
  description: string;
  detail: string;
}

export interface PartyState {
  id: number;
  secret_share_hex: string;
  public_key_hex: string;
}

export interface DkgResponse {
  steps: ProtocolEvent[];
  parties: PartyState[];
  public_key: string;
  threshold: number;
  n_parties: number;
}

export interface SignResponse {
  steps: ProtocolEvent[];
  tx: Record<string, unknown>;
  tx_hash: string;
  signature: string;
  signing_parties: number[];
  coordinator: number;
  offline_parties: number[];
}

export interface VerifyResponse {
  valid: boolean;
  public_key: string;
  signature: string;
  tx_hash: string;
  message: string;
}

export interface StateResponse {
  has_keys: boolean;
  has_signature: boolean;
  public_key: string | null;
  n_parties: number;
  threshold: number;
}

export type Phase =
  | 'idle'
  | 'dkg_loading'
  | 'dkg_animating'
  | 'dkg_complete'
  | 'sign_preview'
  | 'sign_loading'
  | 'sign_animating'
  | 'sign_complete'
  | 'verified';
