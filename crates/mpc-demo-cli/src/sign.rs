use threshold_signatures::{
    frost::eddsa::{sign::sign_v1, KeygenOutput, SignatureOption},
    participants::Participant,
    protocol::Protocol,
    ReconstructionLowerBound,
};

use rand_core::{OsRng, RngCore};

use crate::dkg::DkgResult;

/// Run threshold signing using a subset of the parties whose keys were established
/// during DKG. `signer_indices` selects which parties participate (0-based into
/// `dkg_result.participants`).
pub fn run_signing(
    dkg: &DkgResult,
    signer_indices: &[usize],
    verbose: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let threshold = dkg.threshold;
    let total = dkg.participants.len();

    println!();
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║              PHASE 2 — Threshold Signing                    ║");
    println!("╚══════════════════════════════════════════════════════════════╝");
    println!();

    if signer_indices.len() < threshold as usize {
        return Err(format!(
            "Need at least {threshold} signers but only {} provided",
            signer_indices.len()
        )
        .into());
    }
    if signer_indices.iter().any(|&i| i >= total) {
        return Err(format!(
            "Signer index out of range — only {} parties exist (0..{})",
            total,
            total - 1
        )
        .into());
    }

    // Generate a random 32-byte "transaction" — in practice this would be a real
    // serialised transaction hash you want to authorise.
    let mut tx_bytes = [0u8; 32];
    OsRng.fill_bytes(&mut tx_bytes);

    println!("  Simulated transaction (random 32 B): {}", hex::encode(tx_bytes));
    println!();
    println!("  Concept");
    println!("  ───────");
    println!("  Only {threshold} of {total} parties are online. They each hold a secret share");
    println!("  from DKG. By exchanging FROST round-1 commitments and round-2 signature");
    println!("  shares, the coordinator can aggregate a valid group signature — without");
    println!("  any party revealing their share or the full private key.");
    println!();

    // Collect the signing parties (participant + their key material)
    let signing_parties: Vec<(Participant, KeygenOutput)> = signer_indices
        .iter()
        .map(|&idx| {
            let p = dkg.participants[idx];
            let key = dkg
                .keys
                .iter()
                .find(|(kp, _)| *kp == p)
                .map(|(_, k)| k.clone())
                .ok_or(format!("No key found for party {p:?}"))?;
            Ok((p, key))
        })
        .collect::<Result<_, String>>()?;

    let signer_list: Vec<Participant> = signing_parties.iter().map(|(p, _)| *p).collect();
    let coordinator = signer_list[0];
    let bound: ReconstructionLowerBound = (threshold as usize).into();

    println!("  Signing parties: {:?}", signer_list);
    println!("  Coordinator    : Party {:?}", coordinator);
    println!(
        "  Offline parties: {:?}",
        dkg.participants
            .iter()
            .filter(|p| !signer_list.contains(p))
            .collect::<Vec<_>>()
    );
    println!();

    // Build one sign_v1 Protocol per signing party
    let protocols: Vec<(Participant, Box<dyn Protocol<Output = SignatureOption>>)> = signing_parties
        .iter()
        .map(|(p, key)| {
            let protocol: Box<dyn Protocol<Output = SignatureOption>> = Box::new(sign_v1(
                &signer_list,
                bound,
                *p,
                coordinator,
                key.clone(),
                tx_bytes.to_vec(),
                OsRng,
            )?);
            Ok((*p, protocol))
        })
        .collect::<Result<_, threshold_signatures::errors::InitializationError>>()?;

    if verbose {
        println!("  Message trace:");
    }

    let (results, stats) =
        crate::protocol::run_instrumented(protocols, verbose, "SIGN")?;

    println!();
    println!("  Signing complete!");
    println!("  ─────────────────");
    println!("  Protocol rounds    : {}", stats.rounds);
    println!("  Broadcast messages : {}", stats.broadcast_count);
    println!("  Private messages   : {}", stats.private_count);
    println!("  Total bytes        : {} B", stats.total_bytes);

    // Only the coordinator receives the aggregated signature
    let signature = results
        .iter()
        .find(|(p, sig)| *p == coordinator && sig.is_some())
        .and_then(|(_, sig)| *sig)
        .ok_or("Coordinator did not produce a signature")?;

    println!();
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║              PHASE 3 — Verification                         ║");
    println!("╚══════════════════════════════════════════════════════════════╝");
    println!();

    let public_key = dkg.keys[0].1.public_key;

    match public_key.verify(&tx_bytes, &signature) {
        Ok(()) => {
            println!("  ✓ SIGNATURE VALID");
            println!();
            println!("  The threshold signature over the transaction was produced");
            println!("  by {}/{total} parties cooperating. It verifies against the", signer_indices.len());
            println!("  shared public key established during DKG.");
            println!();
            let sig_hex = signature.serialize().map(|b| hex::encode(b)).unwrap_or_else(|_| "<serialization error>".to_string());
            println!("  Signature (R‖S): {sig_hex}");
        }
        Err(e) => {
            println!("  ✗ SIGNATURE INVALID: {e}");
        }
    }

    Ok(())
}
