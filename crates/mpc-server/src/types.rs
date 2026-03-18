use serde::{Deserialize, Serialize};

/// A single message exchange captured during protocol execution.
/// The frontend uses these to animate the node graph step by step.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProtocolEvent {
    /// Outer loop iteration (roughly maps to a cryptographic round)
    pub round: usize,
    /// Party that sent the message
    pub from_party: u32,
    /// "broadcast" (to all) or "private" (to one)
    pub to_type: String,
    /// Recipient party IDs
    pub to_parties: Vec<u32>,
    /// Size of the message in bytes
    pub bytes: usize,
    /// Short human-readable label for this step
    pub description: String,
    /// Cryptographic explanation for the detail panel
    pub detail: String,
}

/// Key material held by a single party after DKG completes.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PartyState {
    pub id: u32,
    /// Serialized Shamir secret share (hex). NEVER transmitted during protocol.
    pub secret_share_hex: String,
    /// Joint public key (same for all parties)
    pub public_key_hex: String,
}

#[derive(Serialize)]
pub struct DkgResponse {
    /// Ordered list of all message exchanges that occurred
    pub steps: Vec<ProtocolEvent>,
    /// Final key material per party
    pub parties: Vec<PartyState>,
    /// Joint public key hex
    pub public_key: String,
    pub threshold: u32,
    pub n_parties: u32,
}

#[derive(Serialize)]
pub struct SignResponse {
    pub steps: Vec<ProtocolEvent>,
    /// The Solana transaction that was signed
    pub tx: serde_json::Value,
    /// SHA-256 of the serialised transaction (what was actually signed)
    pub tx_hash: String,
    /// Serialised frost_ed25519::Signature in hex
    pub signature: String,
    pub signing_parties: Vec<u32>,
    pub coordinator: u32,
    pub offline_parties: Vec<u32>,
}

#[derive(Serialize)]
pub struct VerifyResponse {
    pub valid: bool,
    pub public_key: String,
    pub signature: String,
    pub tx_hash: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct StateResponse {
    pub has_keys: bool,
    pub has_signature: bool,
    pub public_key: Option<String>,
    pub n_parties: u32,
    pub threshold: u32,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}
