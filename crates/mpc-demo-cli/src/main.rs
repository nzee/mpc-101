mod cli;
mod dkg;
mod protocol;
mod sign;

use clap::Parser;

fn main() {
    let args = cli::Args::parse();

    let result = match args.command {
        cli::Command::Demo {
            parties,
            threshold,
            signers,
            verbose,
        } => run_demo(parties, threshold, signers, verbose),
        cli::Command::Keygen {
            parties,
            threshold,
            verbose,
        } => run_keygen_only(parties, threshold, verbose),
    };

    if let Err(e) = result {
        eprintln!("\nError: {e}");
        std::process::exit(1);
    }
}

fn run_demo(
    parties: u32,
    threshold: u32,
    signers: Option<Vec<u32>>,
    verbose: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    println!();
    println!("MPC Demo — {parties}-party DKG + {threshold}-of-{parties} threshold signing");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    validate_args(parties, threshold)?;

    let dkg_result = dkg::run_dkg(parties, threshold, verbose)?;

    // Which parties will participate in signing
    let signer_indices: Vec<usize> = match signers {
        Some(ids) => ids.into_iter().map(|id| id as usize).collect(),
        None => (0..threshold as usize).collect(), // default: first `threshold` parties
    };

    sign::run_signing(&dkg_result, &signer_indices, verbose)?;

    println!();
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("Takeaways:");
    println!("  • No single party ever held the complete private key.");
    println!("  • Any {threshold} of {parties} parties can produce a valid threshold signature.");
    println!("  • The protocol is interactive: parties exchanged messages to cooperate.");
    println!("  • Run with --verbose to see every message sent between parties.");
    println!();

    Ok(())
}

fn run_keygen_only(
    parties: u32,
    threshold: u32,
    verbose: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    println!();
    println!("MPC Demo — {parties}-party DKG (key generation only)");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    validate_args(parties, threshold)?;
    dkg::run_dkg(parties, threshold, verbose)?;

    Ok(())
}

fn validate_args(parties: u32, threshold: u32) -> Result<(), Box<dyn std::error::Error>> {
    if parties < 2 {
        return Err("Need at least 2 parties".into());
    }
    if threshold < 2 {
        return Err("Threshold must be at least 2".into());
    }
    if threshold > parties {
        return Err(format!("Threshold ({threshold}) cannot exceed party count ({parties})").into());
    }
    Ok(())
}
