use std::collections::HashMap;

use threshold_signatures::{
    errors::ProtocolError,
    participants::Participant,
    protocol::{Action, Protocol},
};

use crate::types::ProtocolEvent;

/// Run a set of protocol participants to completion, routing messages between them
/// in-process and capturing every message exchange as a `ProtocolEvent`.
///
/// The `describe` closure receives `(outer_round, to_type)` and returns a
/// `(description, detail)` pair so callers can attach phase-specific human-readable
/// labels without this function needing to know which protocol is running.
pub fn run_capturing<T, F>(
    mut ps: Vec<(Participant, Box<dyn Protocol<Output = T>>)>,
    describe: F,
) -> Result<(Vec<(Participant, T)>, Vec<ProtocolEvent>), ProtocolError>
where
    F: Fn(usize, &str) -> (String, String),
{
    let indices: HashMap<Participant, usize> =
        ps.iter().enumerate().map(|(i, (p, _))| (*p, i)).collect();

    let size = ps.len();
    let mut out: Vec<(Participant, T)> = Vec::with_capacity(size);
    let mut events: Vec<ProtocolEvent> = Vec::new();
    let mut round = 0usize;

    while out.len() < size {
        round += 1;
        for i in 0..size {
            if out.iter().any(|(p, _)| *p == ps[i].0) {
                continue;
            }
            loop {
                match ps[i].1.poke()? {
                    Action::Wait => break,
                    Action::SendMany(m) => {
                        let bytes = m.len();
                        let to_parties: Vec<u32> = (0..size)
                            .filter(|&j| j != i)
                            .map(|j| u32::from(ps[j].0))
                            .collect();
                        let (description, detail) = describe(round, "broadcast");
                        events.push(ProtocolEvent {
                            round,
                            from_party: u32::from(ps[i].0),
                            to_type: "broadcast".to_string(),
                            to_parties,
                            bytes,
                            description,
                            detail,
                        });
                        for j in 0..size {
                            if i == j {
                                continue;
                            }
                            let from = ps[i].0;
                            ps[j].1.message(from, m.clone())?;
                        }
                    }
                    Action::SendPrivate(to, m) => {
                        let bytes = m.len();
                        let (description, detail) = describe(round, "private");
                        events.push(ProtocolEvent {
                            round,
                            from_party: u32::from(ps[i].0),
                            to_type: "private".to_string(),
                            to_parties: vec![u32::from(to)],
                            bytes,
                            description,
                            detail,
                        });
                        let from = ps[i].0;
                        ps[indices[&to]].1.message(from, m)?;
                    }
                    Action::Return(r) => {
                        out.push((ps[i].0, r));
                        break;
                    }
                }
            }
        }
    }

    Ok((out, events))
}

/// Round descriptions for the DKG phase.
pub fn dkg_describe(round: usize, to_type: &str) -> (String, String) {
    match (round, to_type) {
        (1, _) => (
            "Session ID synchronization".to_string(),
            "Parties agree on a unique session identifier to prevent replay attacks \
             and bind all future messages to this specific DKG run."
                .to_string(),
        ),
        (2, "broadcast") => (
            "Polynomial commitment broadcast".to_string(),
            "Each party commits to their secret polynomial using Feldman VSS. \
             The commitment vector [C₀, C₁, …] lets others verify their share later \
             without revealing the secret."
                .to_string(),
        ),
        (3, "broadcast") => (
            "Hash commitment reveal".to_string(),
            "Parties reveal the hash preimages from round 1, proving they didn't \
             change their polynomial after seeing others' commitments."
                .to_string(),
        ),
        (4, "broadcast") => (
            "Proof of knowledge broadcast".to_string(),
            "Each party broadcasts a Schnorr zero-knowledge proof (ZKP) that they \
             know their secret coefficient without revealing it. Prevents rogue-key attacks."
                .to_string(),
        ),
        (5, "private") => (
            "Secret share distribution".to_string(),
            "Each party privately sends every other party their unique Shamir share \
             — the x=i evaluation of their secret polynomial. Only the recipient can read it."
                .to_string(),
        ),
        _ => (
            format!("Round {round} — {to_type}"),
            "Internal protocol message.".to_string(),
        ),
    }
}

/// Round descriptions for the FROST EdDSA signing phase.
pub fn sign_describe(round: usize, to_type: &str) -> (String, String) {
    match (round, to_type) {
        (1, "broadcast") => (
            "Nonce commitment (R_i)".to_string(),
            "Each signer generates a fresh random nonce pair (d_i, e_i) and broadcasts \
             their commitment R_i = d_i·G + e_i·G. This is the FROST round-1 commitment \
             that prevents forgery and ensures forward secrecy."
                .to_string(),
        ),
        (2, "private") => (
            "Signature share → coordinator".to_string(),
            "Each signer computes their partial signature: s_i = k_i + H(msg, R, pk) · x_i \
             and sends it privately to the coordinator. No other party learns x_i."
                .to_string(),
        ),
        (3, _) => (
            "Coordinator aggregates signature".to_string(),
            "Coordinator sums all valid signature shares: S = Σ s_i \
             and combines with the group nonce R = Σ R_i to produce the final (R, S) signature."
                .to_string(),
        ),
        _ => (
            format!("Round {round} — {to_type}"),
            "Internal signing message.".to_string(),
        ),
    }
}
