use threshold_signatures::{
    frost::eddsa::{Ed25519Sha512, KeygenOutput},
    keygen,
    participants::Participant,
    protocol::Protocol,
    Element, ReconstructionLowerBound, Scalar,
};

use rand_core::OsRng;

pub struct DkgResult {
    /// Ordered list of all participants
    pub participants: Vec<Participant>,
    /// Key material produced for each participant
    pub keys: Vec<(Participant, KeygenOutput)>,
    /// The threshold used during DKG
    pub threshold: u32,
}

/// Run the FROST distributed key generation protocol in-process with `n_parties` simulated
/// parties and the given `threshold` (minimum number of parties needed to sign).
///
/// Every participant runs in the same process; messages are routed via the instrumented
/// protocol runner so you can see the exact communication that would happen over a real
/// network.
pub fn run_dkg(
    n_parties: u32,
    threshold: u32,
    verbose: bool,
) -> Result<DkgResult, Box<dyn std::error::Error>> {
    println!();
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║          PHASE 1 — Distributed Key Generation (DKG)         ║");
    println!("╚══════════════════════════════════════════════════════════════╝");
    println!();
    println!("  Parties    : {n_parties}");
    println!("  Threshold  : {threshold}  (any {threshold} of {n_parties} can sign)");
    println!("  Algorithm  : FROST — Ed25519");
    println!();
    println!("  Concept");
    println!("  ───────");
    println!("  Each party generates a Shamir secret share of a joint private key.");
    println!("  No individual party ever learns the full private key — it only exists");
    println!("  implicitly in the sum of shares. The joint public key is derived");
    println!("  collaboratively and is identical for every participant.");
    println!();

    let participants: Vec<Participant> = (0..n_parties).map(Participant::from).collect();
    let bound: ReconstructionLowerBound = (threshold as usize).into();

    // Build one Protocol instance per participant — in a real deployment each of these
    // would run on a separate machine, communicating over a network.
    let protocols: Vec<(Participant, Box<dyn Protocol<Output = KeygenOutput>>)> = participants
        .iter()
        .map(|p| {
            let protocol: Box<dyn Protocol<Output = KeygenOutput>> =
                Box::new(keygen::<Ed25519Sha512>(&participants, *p, bound, OsRng)?);
            Ok((*p, protocol))
        })
        .collect::<Result<_, threshold_signatures::errors::InitializationError>>()?;

    if verbose {
        println!("  Message trace:");
    }

    let (results, stats) =
        crate::protocol::run_instrumented(protocols, verbose, "DKG")?;

    let public_key = results
        .first()
        .map(|(_, k)| k.public_key)
        .ok_or("DKG produced no results")?;

    println!();
    println!("  DKG complete!");
    println!("  ─────────────");
    println!("  Protocol rounds    : {}", stats.rounds);
    println!("  Broadcast messages : {}", stats.broadcast_count);
    println!("  Private messages   : {}", stats.private_count);
    println!("  Total bytes        : {} B", stats.total_bytes);
    println!();
    let pk_hex = public_key.serialize().map(|b| hex::encode(b)).unwrap_or_else(|_| "<serialization error>".to_string());
    println!("  Shared public key  : {pk_hex}");
    println!();

    // Verify all parties derived the same public key (sanity check)
    for (p, k) in &results {
        assert_eq!(
            k.public_key, public_key,
            "Party {p:?} has a different public key — DKG is broken"
        );
    }
    println!("  ✓ All {n_parties} parties agree on the same public key");

    Ok(DkgResult {
        participants,
        keys: results,
        threshold,
    })
}

// Tell the Rust compiler the Send bounds we need for boxing.
// These are automatically satisfied by the concrete Ed25519Sha512 ciphersuite.
const _: () = {
    fn _check()
    where
        Element<Ed25519Sha512>: Send,
        Scalar<Ed25519Sha512>: Send,
    {
    }
};
