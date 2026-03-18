use std::collections::HashMap;

use threshold_signatures::{
    errors::ProtocolError,
    participants::Participant,
    protocol::{Action, Protocol},
};

pub struct Stats {
    pub rounds: usize,
    pub broadcast_count: usize,
    pub private_count: usize,
    pub total_bytes: usize,
}

/// Run a set of protocol participants to completion, routing messages between them
/// in-process. Prints a trace of every message if `verbose` is true.
///
/// This is an instrumented version of the canonical `run_protocol` helper from the
/// NEAR MPC test suite. In production each participant would run on a separate machine
/// and messages would travel over a real network.
pub fn run_instrumented<T>(
    mut ps: Vec<(Participant, Box<dyn Protocol<Output = T>>)>,
    verbose: bool,
    phase: &str,
) -> Result<(Vec<(Participant, T)>, Stats), ProtocolError> {
    let indices: HashMap<Participant, usize> =
        ps.iter().enumerate().map(|(i, (p, _))| (*p, i)).collect();

    let size = ps.len();
    let mut out: Vec<(Participant, T)> = Vec::with_capacity(size);
    let mut stats = Stats {
        rounds: 0,
        broadcast_count: 0,
        private_count: 0,
        total_bytes: 0,
    };
    let mut round = 0usize;

    while out.len() < size {
        round += 1;
        for i in 0..size {
            // Skip parties that have already finished
            if out.iter().any(|(p, _)| *p == ps[i].0) {
                continue;
            }
            // Drive this party until it either needs to wait for a message or finishes
            loop {
                match ps[i].1.poke()? {
                    Action::Wait => break,
                    Action::SendMany(m) => {
                        let bytes = m.len();
                        stats.broadcast_count += 1;
                        stats.total_bytes += bytes * (size - 1);
                        if verbose {
                            println!(
                                "    [Round {round}] Party {:?} BROADCAST {} B → {} recipients",
                                ps[i].0,
                                bytes,
                                size - 1
                            );
                        }
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
                        stats.private_count += 1;
                        stats.total_bytes += bytes;
                        if verbose {
                            println!(
                                "    [Round {round}] Party {:?} PRIVATE  {} B → Party {:?}",
                                ps[i].0,
                                bytes,
                                to
                            );
                        }
                        let from = ps[i].0;
                        ps[indices[&to]].1.message(from, m)?;
                    }
                    Action::Return(r) => {
                        if verbose {
                            println!(
                                "    [Round {round}] Party {:?} completed {}",
                                ps[i].0, phase
                            );
                        }
                        out.push((ps[i].0, r));
                        break;
                    }
                }
            }
        }
        stats.rounds = round;
    }

    Ok((out, stats))
}
