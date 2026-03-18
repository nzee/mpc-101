use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(
    name = "mpc-demo",
    version,
    about = "Demonstrates MPC Distributed Key Generation (DKG) and threshold signing in-process.\n\
             Uses FROST Ed25519 — no network nodes required, all parties simulated locally."
)]
pub struct Args {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Subcommand, Debug)]
pub enum Command {
    /// Run the full DKG + threshold signing demonstration (default: 2-of-3)
    Demo {
        /// Total number of MPC parties
        #[arg(short, long, default_value = "3")]
        parties: u32,

        /// Minimum parties required to produce a signature (threshold)
        #[arg(short, long, default_value = "2")]
        threshold: u32,

        /// Specific party indices to use for signing, comma-separated (e.g. "1,2")
        /// Defaults to first <threshold> parties
        #[arg(short, long, value_delimiter = ',')]
        signers: Option<Vec<u32>>,

        /// Show every protocol message exchange (broadcast and private)
        #[arg(short, long)]
        verbose: bool,
    },

    /// Run only the DKG key generation phase
    Keygen {
        /// Total number of MPC parties
        #[arg(short, long, default_value = "3")]
        parties: u32,

        /// Minimum parties required to reconstruct the key (threshold)
        #[arg(short, long, default_value = "2")]
        threshold: u32,

        /// Show every protocol message exchange
        #[arg(short, long)]
        verbose: bool,
    },
}
