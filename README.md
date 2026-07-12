# Seal — AI-Powered Delivery Acceptance Escrow on GenLayer

Seal is a decentralized delivery acceptance escrow dApp built on GenLayer. Buyers lock GEN tokens in a smart contract, set detailed acceptance criteria, and invite a contributor to deliver work. The contributor submits their delivery with evidence URLs and a self-assessed completion score. GenLayer's AI validators then autonomously evaluate the submission against the acceptance criteria using the equivalence principle — issuing a verdict that releases escrow to the contributor, refunds the buyer, requests a revision, or splits payment. No human arbitration, no disputes, no trust required. The entire acceptance lifecycle — from funding to payout — is handled on-chain. Built with Next.js 15, Tailwind CSS v4, and genlayer-js on StudioNet (Chain 61999).

---

## Live Demo

[https://seal-build.vercel.app](https://seal-build.vercel.app)

---

## How It Works

1. **Buyer** creates a Work Seal — locks GEN escrow, sets acceptance criteria and deadline, optionally invites a contributor and requires a bond
2. **Contributor** accepts the seal (posting bond if required) and delivers work with evidence URLs
3. **GenLayer validators** independently fetch each evidence URL themselves (`gl.nondet.web.render`) and judge the delivery against the acceptance criteria using `eq_principle`
4. **Verdict** is issued on-chain — full release, partial split, revision request, or refund
5. **Claims** are settled — contributor claims payout, buyer claims any refund, bond is returned or slashed

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 App Router, Tailwind CSS v4, genlayer-js |
| Contract | Python intelligent contract on StudioNet (Chain 61999) |
| AI Validation | GenLayer `eq_principle` (equivalence principle consensus) |
| Deployment | Vercel |

---

## Contract

- **Address:** `0x6269D0584b30c2eAed97FE2727fA540850949a67`
- **Network:** StudioNet · Chain 61999
- **File:** `contract/SealContract.py`

---

## Local Development

```bash
npm install
cp .env.local.example .env.local  # add your contract address and RPC URL
npm run dev
```

### Environment Variables

```
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_CONTRACT_ADDRESS=0x6269D0584b30c2eAed97FE2727fA540850949a67
NEXT_PUBLIC_EXPLORER_URL=https://explorer-studio.genlayer.com
```

---

## Pages

| Route | Description |
|---|---|
| `/` | Dock — landing and network status |
| `/explore` | Browse all public Work Seals |
| `/create` | Open a new Work Seal as buyer |
| `/dashboard/buyer` | Buyer Desk — manage your funded seals |
| `/dashboard/contributor` | Contributor Bay — manage your accepted work |
| `/work/[id]` | Work Room — submit delivery, request verdict |
| `/seal/[id]` | Public seal detail view |
| `/claims` | Claim Gate — collect payouts, refunds, bonds |
| `/activity` | Activity Log — wallet event history |
| `/admin` | Admin Monitor — contract-wide stats |

---

## License

MIT
