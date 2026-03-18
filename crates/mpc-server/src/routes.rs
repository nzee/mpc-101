use axum::{extract::State, http::StatusCode, Json};
use rand_core::OsRng;
use sha2::{Digest, Sha256};

use threshold_signatures::{
    frost::eddsa::{sign::sign_v1, Ed25519Sha512, KeygenOutput},
    keygen,
    participants::Participant,
    protocol::Protocol,
    Element, ReconstructionLowerBound, Scalar,
};

use crate::{
    protocol::{dkg_describe, run_capturing, sign_describe},
    state::{AppState, KeysState, SignatureState},
    types::{
        DkgResponse, ErrorResponse, PartyState, SignResponse, StateResponse, VerifyResponse,
    },
};

// ── DKG ─────────────────────────────────────────────────────────────────────

pub async fn dkg(
    State(state): State<AppState>,
) -> Result<Json<DkgResponse>, (StatusCode, Json<ErrorResponse>)> {
    let (keys, response) = tokio::task::spawn_blocking(move || run_dkg_blocking())
        .await
        .map_err(|e| server_err(format!("task join error: {e}")))?
        .map_err(|e| server_err(e))?;

    // Store keys in shared state
    {
        let mut inner = state.0.lock().map_err(|_| server_err("lock poisoned"))?;
        inner.keys = Some(KeysState {
            keys,
            party_states: response.parties.clone(),
            public_key_hex: response.public_key.clone(),
        });
        inner.last_sig = None; // reset on new keygen
    }

    Ok(Json(response))
}

fn run_dkg_blocking() -> Result<(Vec<(Participant, KeygenOutput)>, DkgResponse), String> {
    const N: u32 = 3;
    const T: u32 = 2;

    let participants: Vec<Participant> = (0..N).map(Participant::from).collect();
    let bound: ReconstructionLowerBound = (T as usize).into();

    let protocols: Vec<(Participant, Box<dyn Protocol<Output = KeygenOutput>>)> = participants
        .iter()
        .map(|p| {
            let proto: Box<dyn Protocol<Output = KeygenOutput>> =
                Box::new(keygen::<Ed25519Sha512>(&participants, *p, bound, OsRng).map_err(
                    |e| format!("keygen init error: {e}"),
                )?);
            Ok((*p, proto))
        })
        .collect::<Result<_, String>>()?;

    let (results, events) =
        run_capturing(protocols, dkg_describe).map_err(|e| format!("DKG failed: {e}"))?;

    // Serialise key material per party
    let parties: Vec<PartyState> = results
        .iter()
        .map(|(p, key)| {
            let json = serde_json::to_value(key).unwrap_or_default();
            let share_hex = json["private_share"]
                .as_str()
                .unwrap_or("unavailable")
                .to_string();
            let pk_hex = json["public_key"]
                .as_str()
                .unwrap_or("unavailable")
                .to_string();
            PartyState {
                id: u32::from(*p),
                secret_share_hex: share_hex,
                public_key_hex: pk_hex,
            }
        })
        .collect();

    let public_key = parties
        .first()
        .map(|p| p.public_key_hex.clone())
        .unwrap_or_default();

    let response = DkgResponse {
        steps: events,
        parties,
        public_key,
        threshold: T,
        n_parties: N,
    };
    Ok((results, response))
}

// Confirm that Ed25519Sha512 satisfies the Send bounds needed for boxing.
const _: () = {
    fn _check()
    where
        Element<Ed25519Sha512>: Send,
        Scalar<Ed25519Sha512>: Send,
    {
    }
};

// ── SIGN ─────────────────────────────────────────────────────────────────────

pub async fn sign(
    State(state): State<AppState>,
) -> Result<Json<SignResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Clone keys out of the mutex before spawning the blocking task
    let keys_state = {
        let inner = state
            .0
            .lock()
            .map_err(|_| server_err("lock poisoned"))?;
        inner
            .keys
            .clone()
            .ok_or_else(|| bad_request("No keys found — run DKG first"))?
    };

    let result = tokio::task::spawn_blocking(move || run_sign_blocking(keys_state.keys))
        .await
        .map_err(|e| server_err(format!("task join error: {e}")))?
        .map_err(|e| server_err(e))?;

    // Persist signature
    {
        let mut inner = state.0.lock().map_err(|_| server_err("lock poisoned"))?;
        inner.last_sig = Some(SignatureState {
            signature_hex: result.signature.clone(),
            tx_hash_hex: result.tx_hash.clone(),
            tx: result.tx.clone(),
        });
    }

    Ok(Json(result))
}

fn run_sign_blocking(
    keys: Vec<(Participant, KeygenOutput)>,
) -> Result<SignResponse, String> {
    // Build a Solana-style SOL transfer transaction
    let tx = serde_json::json!({
        "feePayer":       "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "recipient":      "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV1",
        "lamports":       1500000000,
        "recentBlockhash":"EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N",
        "programId":      "11111111111111111111111111111111"
    });

    // Serialize and hash the transaction message (SHA-256 of the serialized bytes)
    let tx_bytes = serde_json::to_vec(&tx).map_err(|e| e.to_string())?;
    let tx_hash: Vec<u8> = Sha256::digest(&tx_bytes).to_vec();

    // Sign with parties 0 and 1 (threshold = 2)
    let signing_indices = [0usize, 1];
    let signing_parties: Vec<(Participant, KeygenOutput)> = signing_indices
        .iter()
        .map(|&i| keys[i].clone())
        .collect();

    let signer_list: Vec<Participant> = signing_parties.iter().map(|(p, _)| *p).collect();
    let coordinator = signer_list[0];
    let bound: ReconstructionLowerBound = 2usize.into();

    let protocols: Vec<(Participant, Box<dyn Protocol<Output = _>>)> = signing_parties
        .iter()
        .map(|(p, key)| {
            let proto: Box<dyn Protocol<Output = _>> = Box::new(
                sign_v1(
                    &signer_list,
                    bound,
                    *p,
                    coordinator,
                    key.clone(),
                    tx_hash.clone(),
                    OsRng,
                )
                .map_err(|e| format!("sign init error: {e}"))?,
            );
            Ok((*p, proto))
        })
        .collect::<Result<_, String>>()?;

    let (results, events) =
        run_capturing(protocols, sign_describe).map_err(|e| format!("signing failed: {e}"))?;

    // Extract signature from coordinator
    let signature = results
        .into_iter()
        .find(|(p, sig)| *p == coordinator && sig.is_some())
        .and_then(|(_, sig)| sig)
        .ok_or("Coordinator did not produce a signature")?;

    let sig_json = serde_json::to_value(&signature).map_err(|e| e.to_string())?;
    let sig_hex = sig_json.as_str().unwrap_or("").to_string();

    let offline: Vec<u32> = keys
        .iter()
        .map(|(p, _)| u32::from(*p))
        .filter(|id| !signing_indices.iter().any(|&i| keys[i].0 == Participant::from(*id)))
        .collect();

    Ok(SignResponse {
        steps: events,
        tx,
        tx_hash: hex::encode(&tx_hash),
        signature: sig_hex,
        signing_parties: signing_parties.iter().map(|(p, _)| u32::from(*p)).collect(),
        coordinator: u32::from(coordinator),
        offline_parties: offline,
    })
}

// ── VERIFY ───────────────────────────────────────────────────────────────────

pub async fn verify(
    State(state): State<AppState>,
) -> Result<Json<VerifyResponse>, (StatusCode, Json<ErrorResponse>)> {
    let (keys_state, sig_state) = {
        let inner = state.0.lock().map_err(|_| server_err("lock poisoned"))?;
        let k = inner
            .keys
            .clone()
            .ok_or_else(|| bad_request("No keys — run DKG first"))?;
        let s = inner
            .last_sig
            .clone()
            .ok_or_else(|| bad_request("No signature — run Sign first"))?;
        (k, s)
    };

    let result =
        tokio::task::spawn_blocking(move || run_verify_blocking(keys_state, sig_state))
            .await
            .map_err(|e| server_err(format!("task join error: {e}")))?
            .map_err(|e| server_err(e))?;

    Ok(Json(result))
}

fn run_verify_blocking(
    keys_state: KeysState,
    sig_state: SignatureState,
) -> Result<VerifyResponse, String> {
    // Reconstruct the public key from the stored hex
    let pk_bytes = hex::decode(&keys_state.public_key_hex).map_err(|e| e.to_string())?;
    let public_key = threshold_signatures::frost_ed25519::VerifyingKey::deserialize(
        pk_bytes
            .as_slice()
            .try_into()
            .map_err(|_| "invalid pk length")?,
    )
    .map_err(|e| format!("pk deserialize: {e}"))?;

    // Reconstruct the signature from hex
    let sig_bytes = hex::decode(&sig_state.signature_hex).map_err(|e| e.to_string())?;
    let signature = threshold_signatures::frost_ed25519::Signature::deserialize(
        sig_bytes
            .as_slice()
            .try_into()
            .map_err(|_| "invalid sig length")?,
    )
    .map_err(|e| format!("sig deserialize: {e}"))?;

    let tx_hash_bytes = hex::decode(&sig_state.tx_hash_hex).map_err(|e| e.to_string())?;

    let valid = public_key.verify(&tx_hash_bytes, &signature).is_ok();

    Ok(VerifyResponse {
        valid,
        public_key: keys_state.public_key_hex,
        signature: sig_state.signature_hex,
        tx_hash: sig_state.tx_hash_hex,
        message: if valid {
            "Signature is valid — the threshold group authorised this transaction.".to_string()
        } else {
            "Signature verification failed.".to_string()
        },
    })
}

// ── STATE ────────────────────────────────────────────────────────────────────

pub async fn app_state(
    State(state): State<AppState>,
) -> Result<Json<StateResponse>, (StatusCode, Json<ErrorResponse>)> {
    let inner = state.0.lock().map_err(|_| server_err("lock poisoned"))?;
    Ok(Json(StateResponse {
        has_keys: inner.keys.is_some(),
        has_signature: inner.last_sig.is_some(),
        public_key: inner.keys.as_ref().map(|k| k.public_key_hex.clone()),
        n_parties: 3,
        threshold: 2,
    }))
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn server_err(msg: impl Into<String>) -> (StatusCode, Json<ErrorResponse>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ErrorResponse {
            error: msg.into(),
        }),
    )
}

fn bad_request(msg: impl Into<String>) -> (StatusCode, Json<ErrorResponse>) {
    (
        StatusCode::BAD_REQUEST,
        Json(ErrorResponse {
            error: msg.into(),
        }),
    )
}
