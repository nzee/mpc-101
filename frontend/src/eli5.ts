/** ELI5 translations keyed on the description string the server sends. */

interface StepText { description: string; detail: string }

const MAP: Record<string, StepText> = {
  // ── DKG ────────────────────────────────────────────────────────────────────
  'Session ID synchronization': {
    description: 'Agree on a room code',
    detail:
      'All 3 parties agree on a unique ID for this session — like agreeing on a secret room code before the meeting starts. This stops anyone from sneaking in old messages from a different session.',
  },
  'Polynomial commitment broadcast': {
    description: 'Each party locks in their secret number',
    detail:
      "Each party picks a secret number and seals it in a digital envelope, then shows everyone the sealed envelope. They can't change their secret later — you'd see if the envelope was tampered with.",
  },
  'Hash commitment reveal': {
    description: 'Open the envelopes',
    detail:
      "Now each party opens their envelope to prove what was really inside. This confirms nobody peeked at what the others chose and then changed their own number to cheat.",
  },
  'Proof of knowledge broadcast': {
    description: "Prove you know your secret — without saying what it is",
    detail:
      "Each party uses a clever math trick to prove: 'I really do know my secret number' — without ever saying the number out loud. Like proving you know a password by unlocking a door, not by reading the password aloud.",
  },
  'Secret share distribution': {
    description: 'Hand each friend their puzzle piece',
    detail:
      "Each party secretly gives every other party one unique piece of their secret. Only the intended person can read it. Any 2-of-3 of these pieces is enough to sign — but no single piece gives away anything on its own.",
  },

  // ── SIGNING ────────────────────────────────────────────────────────────────
  'Nonce commitment (R_i)': {
    description: 'Each signer rolls dice and shows the result',
    detail:
      "Each signer picks a fresh random number (like rolling dice). They announce a locked commitment to that number so everyone knows they picked it now — not after seeing what others did. This randomness makes every signature unique.",
  },
  'Signature share → coordinator': {
    description: 'Each signer whispers their piece of the signature',
    detail:
      "Using their secret key slice and the random number from Step 1, each signer computes their contribution to the final signature and sends it privately to the coordinator. Nobody else hears it — the private key never leaves anyone's hands.",
  },
  'Coordinator aggregates signature': {
    description: 'Coordinator adds all the pieces together',
    detail:
      "The coordinator combines every signer's piece into the final signature. Think of it like each person writing part of a sentence and handing it to the editor — the editor assembles the final document without knowing any individual's 'source notes'.",
  },
};

export function eli5Step(description: string, detail: string, eli5: boolean): { description: string; detail: string } {
  if (!eli5) return { description, detail };
  const mapped = MAP[description];
  return mapped ?? { description, detail };
}

// ── Static UI strings ────────────────────────────────────────────────────────

export const ELI5_UI = {
  secretShareLabel: 'Your puzzle piece (private)',
  secretShareSublabel: 'Your personal slice of the shared secret. Alone it means nothing. Combine any 2-of-3 slices and you can sign — but no single slice reveals the full key.',
  publicKeyLabel: 'The shared wallet address (public)',
  publicKeySublabel: 'Everyone agrees this is the group wallet address. Safe to share publicly — like an email address.',
  signingContributionTitle: 'Your signature contribution',
  signingContributionCoordinator: '→ Collected all signature pieces and added them into the final signature',
  signingContributionSigner: '→ Computed your piece of the signature (using your private key slice + your random number) and whispered it to the coordinator',
  offlineNote: '✗ Sat out this signing round — your key slice is safe and untouched',
  dkgComplete: '✓ Wallets set up — the group now shares a public key',
  roundNames: {
    dkg: {
      1: 'Agree on a room code',
      2: 'Lock in secret numbers',
      3: 'Open the envelopes',
      4: 'Prove you know your secret',
      5: 'Hand out puzzle pieces',
    },
    sign: {
      1: 'Everyone rolls dice',
      2: 'Whisper your piece to the coordinator',
      3: 'Add all pieces together',
    },
  } as Record<string, Record<number, string>>,
};

export const TECH_UI = {
  secretShareLabel: 'Secret Share',
  secretShareSublabel: 'Shamir share — your unique point on the shared secret polynomial',
  publicKeyLabel: 'Joint Public Key',
  publicKeySublabel: 'Shared by all parties — the threshold group\'s public key',
  signingContributionTitle: 'Signing Contribution',
  signingContributionCoordinator: '→ Collected all signature shares and aggregated the final signature',
  signingContributionSigner: '→ Computed signature share s_i = k_i + H(msg,R,pk)·x_i and sent to coordinator',
  offlineNote: '✗ Not participating in this signing round — private key share is safe and unused',
  dkgComplete: '✓ DKG complete — shared public key established',
  roundNames: {
    dkg: {
      1: 'Session ID sync',
      2: 'Polynomial commitments',
      3: 'Hash commitment reveal',
      4: 'Proof of knowledge',
      5: 'Secret share distribution',
    },
    sign: {
      1: 'Nonce commitments',
      2: 'Signature shares → coordinator',
      3: 'Aggregation',
    },
  } as Record<string, Record<number, string>>,
};
