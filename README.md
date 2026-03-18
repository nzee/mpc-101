# MPC-101 — FROST Threshold Signing Demo

**Live demo:** [https://mpc-demo.fly.dev](https://mpc-demo.fly.dev)

This repo is a fork of the [NEAR MPC node](https://github.com/near/mpc) that powers [Chain Signatures](https://docs.near.org/chain-abstraction/chain-signatures), extended with an interactive web demo that visualises how the underlying FROST threshold signature protocol actually works — step by step, with an ELI5 toggle for non-cryptographers.

## What the demo shows

The demo runs a full **2-of-3 FROST DKG + threshold Ed25519 signing** pipeline in your browser against a live Rust backend:

1. **Distributed Key Generation** — 3 parties run the FROST DKG protocol over 5 rounds. Watch every message as it flows between nodes: hash commitments, Feldman VSS polynomial commitments, Schnorr proofs of knowledge, and Shamir share distribution. Secret shares are hidden behind a pulsing placeholder until the protocol completes — because they don't exist until then.

2. **Threshold Signing** — Any 2 of the 3 parties co-sign a Solana SOL-transfer transaction. The protocol is FROST round-1 (nonce commitments) + round-2 (partial signatures → coordinator) + aggregation. The resulting signature is a standard Ed25519 signature, verifiable by any Ed25519 implementation.

3. **Verification** — The final signature is verified against the joint public key produced by DKG, with a step-by-step walkthrough of the Ed25519 verification equation.

**ELI5 toggle** — Every cryptographic concept has a plain-language equivalent. Toggle it in the top-right corner to switch between the full technical view (polynomial commitments, Lagrange coefficients, Fiat-Shamir challenges) and an accessible version using analogies (sealed envelopes, vault locks, shadow of an object).

> **Note on the simulation:** All 3 parties run in the same Rust process on one server. The cryptographic protocol messages are identical to what a real distributed deployment would exchange — but network isolation is simulated. The NEAR MPC nodes this codebase is built for run each party on a separate TEE-secured machine with TLS-authenticated P2P transport.

## Why Solana?

The demo signs a Solana SOL transfer. Solana uses **Ed25519 natively**, which is the exact curve FROST EdDSA operates on. The produced signature is bit-for-bit compatible with what Solana's runtime would verify. (Ethereum uses secp256k1/ECDSA, which requires a different and more complex threshold protocol.)

## Added crates

| Crate | Purpose |
|-------|---------|
| `crates/mpc-server` | Axum HTTP server (port 3000): `/api/dkg`, `/api/sign`, `/api/verify`, `/api/state` |
| `crates/mpc-demo-cli` | CLI version of the same DKG + signing flow |

## Running locally

```bash
# Backend (port 3000)
cargo run -p mpc-server

# Frontend (port 5173) — in a separate terminal
cd frontend && npm install && npm run dev -- --open
```

The frontend proxies `/api/*` to `localhost:3000`, so no CORS configuration needed.

## Deploying

The repo includes a multi-stage `Dockerfile` and `fly.toml`. The frontend is built and served as static files by the Axum backend — single binary, no separate static host needed.

```bash
fly deploy --remote-only
```

---

*The rest of this README covers the original NEAR MPC node.*

---

# NEAR MPC Node

This repository contains the code for the NEAR MPC node that powers [Chain Signatures](https://docs.near.org/chain-abstraction/chain-signatures).

## How it works

There are two main parts of the binary: NEAR indexer and MPC signing.

### NEAR Indexer

The indexer is a NEAR node that tracks the shard where the signing smart contract lives (for mainnet, `v1.signer`). See the [chain-gateway design doc](docs/chain-gateway-design.md) for details. It monitors incoming requests by looking at successful calls to the `sign` function. Each request is hashed and mapped to a specific node in the MPC network — the *leader* for that request. The leader initiates the signing process and submits the final signature back to the smart contract. If the leader is offline, a secondary leader can take over.

### MPC Signing

The node supports multiple threshold signature schemes, organized into *domains*. Each domain has a unique ID, a signature scheme, and a purpose (signing, foreign-chain transactions, or confidential key derivation). All schemes share the same [FROST](https://eprint.iacr.org/2020/852)-based distributed key generation (DKG) but differ in their signing workflows.

#### Supported schemes

**OT-based ECDSA** (Secp256k1) — Originally derived from [Cait-Sith](https://github.com/cronokirby/cait-sith). Uses an offline phase with two protocols:
  - *Triple generation*: runs continuously in the background (target: up to 1M Beaver triples per node).
  - *Presignature generation*: also runs in the background; each presignature consumes two triples.
  - *Signing*: one round of communication using a presignature.

**Robust ECDSA** (Secp256k1) — Based on [DJNPO20](https://eprint.iacr.org/2020/501). Skips triple generation entirely:
  - *Presignature generation*: a single 3-round protocol using degree-2t polynomials.
  - *Signing*: one round, same as OT-based ECDSA.

**EdDSA** (Ed25519) — Based on [FROST](https://eprint.iacr.org/2020/852) threshold signatures:
  - *Presignature generation*: participants exchange nonce commitments.
  - *Signing*: one round using a presignature.

For each scheme, the participating set is fixed from the offline phase through to signature generation: if a presignature is generated by a specific set of participants, the resulting signature uses the same set.

#### Other capabilities

**Confidential Key Derivation** (BLS12-381) — Derives application-specific keys without revealing the master secret. Takes an application ID and produces a derived key using oblivious transfer and Diffie-Hellman.

**Foreign chain transaction verification** — The network can verify transactions on foreign chains (Ethereum, Solana, Bitcoin, etc.) before signing. Nodes independently query configured RPC providers, run deterministic extractors over the results, and produce a threshold signature over the observed values. This enables NEAR contracts to react to external chain events without a trusted relayer. See [docs/foreign-chain-transactions.md](docs/foreign-chain-transactions.md) for the full design.

## TEE Integration

MPC nodes can run inside a trusted execution environment (TEE). For more details, see the [TEE design doc](docs/securing-mpc-with-tee-design-doc.md).

## Dependencies and submodules

All crates are organized in a [Cargo workspace](Cargo.toml) under `crates/`.

- **Nearcore Node**: Included as a submodule in `/libs`, used only for system tests (pytest). Not required for building the node or contract.
- **Other Dependencies**: All other dependencies are handled by Cargo.

## Development Environment (Nix)

A Nix flake provides a reproducible development environment with the Rust toolchain, LLVM/Clang, NEAR CLI, and all system dependencies pre-configured. Run `nix develop` to enter the shell.

For setup details (direnv integration, VS Code config, verification), see [docs/nix-dev-environment.md](docs/nix-dev-environment.md).

## Building

Build the MPC node:

```bash
cargo build -p mpc-node --release
```

Build the smart contract:

```bash
cargo near build non-reproducible-wasm --features abi --profile=release-contract \
  --manifest-path crates/contract/Cargo.toml --locked
```

The Rust toolchain version is pinned in [`rust-toolchain.toml`](rust-toolchain.toml); rustup handles installation automatically.

## Testing

### Terminology

We use the following terminology when referring to tests:
- _unit test_ -> a rust test in `/src` folder (per crate)
- _integration test_ -> a rust test in `/tests` folder (per crate)
- _system test_ -> a pytest in the `/pytest` folder

### Run tests

- **Unit and integration tests**: Run with `cargo nextest run --cargo-profile=test-release`
- **System tests**: See the README in the `/pytest` directory.

### Updating snapshots

We use [`cargo insta`](https://insta.rs/) for snapshot testing to guard against
unintended changes to ABIs, serialization formats, and deterministic outputs.

If a snapshot test fails, it means the output has changed relative to the
accepted `.snap` file. To resolve this:

1. **Review the diff.** Run the failing test to see what changed:
   ```bash
   cargo nextest run --cargo-profile=test-release <test_name>
   ```
   This creates a `.snap.new` file next to the existing `.snap` file.

2. **Accept or reject.** Use `cargo insta` to interactively review pending
   snapshots:
   ```bash
   cargo insta review
   ```
   This walks you through each changed snapshot and lets you accept or reject it.

   Alternatively, to accept all pending snapshots at once:
   ```bash
   cargo insta accept
   ```

3. **Commit the updated `.snap` files.** The updated snapshots should be
   committed alongside your code changes.

> **Important:** Snapshot tests exist to catch accidental breaking changes.
> Before accepting a new snapshot, make sure the change is intentional and
> won't break compatibility (e.g. with existing on-chain data or client
> integrations).

If you don't have `cargo insta` installed:
```bash
cargo install cargo-insta
```

## Reproducible Builds

Both the node and launcher Docker images support reproducible builds, ensuring identical binaries from the same source. Run `./deployment/build-images.sh` from the project root.

For prerequisites and options, see [docs/reproducible-builds.md](docs/reproducible-builds.md).

## Releases

This project follows a standard release process with semantic versioning. Each release includes both the MPC node binary and the chain signatures contract as a single bundle.

For detailed information about our release process, compatibility guarantees, and procedures, see [RELEASES.md](RELEASES.md).

**Key Release Principles:**

- Releases are created from the `main` branch using semantic versioning.
- Minor versions maintain backward compatibility with previous node versions.
- Major versions ensure contract compatibility with the previous major version.

## Contributions

We welcome contributions in the form of issues, feature requests, and pull requests. Please ensure any changes are well-documented and tested. For major changes, open an issue to discuss the proposed modifications first.

### Development workflow

We run several checks in CI that require tools beyond the default Rust toolchain. The [nix environment](docs/nix-dev-environment.md) installs all of them automatically.

- [`cargo-make`](https://github.com/sagiegurari/cargo-make)
- [`cargo-nextest`](https://github.com/nextest-rs/nextest)
- [`cargo-sort`](https://github.com/DevinR528/cargo-sort)
- [`cargo-shear`](https://github.com/Boshen/cargo-shear)
- [`cargo-deny`](https://github.com/EmbarkStudios/cargo-deny)
- [`zizmor`](https://github.com/woodruffw/zizmor)
- [`ruff`](https://github.com/astral-sh/ruff)
- [`lychee`](https://github.com/lycheeverse/lychee)
- [`python`](https://www.python.org/) (3.11) with [`tree-sitter`](https://pypi.org/project/tree-sitter/) and [`tree-sitter-rust`](https://pypi.org/project/tree-sitter-rust/)

This set does not include all checks, but only the most common reasons for CI
failures. Therefore, we suggest running these checks locally before opening a
PR. Running these checks with the correct parameters can be done easily with
`cargo-make`.

Running fast checks:

```console
cargo make check-all-fast
```

Running all `cargo-make` supported checks:

```console
cargo make check-all
```
