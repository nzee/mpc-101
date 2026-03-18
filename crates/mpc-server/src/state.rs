use std::sync::{Arc, Mutex};

use threshold_signatures::frost::eddsa::KeygenOutput;

use crate::types::PartyState;

/// Data stored after a successful DKG run.
#[derive(Clone)]
pub struct KeysState {
    /// Key material for each party (index = party id)
    pub keys: Vec<(threshold_signatures::participants::Participant, KeygenOutput)>,
    pub party_states: Vec<PartyState>,
    pub public_key_hex: String,
}

/// Data stored after a successful signing run.
#[derive(Clone)]
pub struct SignatureState {
    pub signature_hex: String,
    pub tx_hash_hex: String,
    pub tx: serde_json::Value,
}

#[derive(Default)]
pub struct Inner {
    pub keys: Option<KeysState>,
    pub last_sig: Option<SignatureState>,
}

/// Shared application state passed to all Axum handlers.
#[derive(Clone, Default)]
pub struct AppState(pub Arc<Mutex<Inner>>);
