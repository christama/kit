---
name: ton-create-wallet
description: Create and deploy a TON agentic wallet. Use when the user wants to create a wallet, set up an agent wallet, deploy an agentic wallet, onboard a new wallet, or when any wallet operation fails because no wallet is configured. This skill is a prerequisite before sending, swapping, or managing assets.
user-invocable: true
disable-model-invocation: false
---

# Create TON Agentic Wallet

Deploy an on-chain agentic wallet on TON. The agent generates operator keys, the user deploys the wallet contract from the dashboard, and a callback completes the setup automatically.

## MCP Tools

| Tool | Description |
| ---- | ----------- |
| `agentic_start_root_wallet_setup` | Generate operator keys, create pending setup, return dashboard URL |
| `agentic_list_pending_root_wallet_setups` | List pending setup drafts and their callback status |
| `agentic_get_root_wallet_setup` | Read one pending setup by `setupId` |
| `agentic_complete_root_wallet_setup` | Finish onboarding from callback or manual wallet address |
| `agentic_cancel_root_wallet_setup` | Cancel a pending setup |

### Tool Parameters

| Tool | Required | Optional |
| ---- | -------- | -------- |
| `agentic_start_root_wallet_setup` | — | `network`, `name`, `source`, `collectionAddress`, `tonDeposit` |
| `agentic_get_root_wallet_setup` | `setupId` | — |
| `agentic_complete_root_wallet_setup` | `setupId` | `walletAddress`, `ownerAddress` |
| `agentic_cancel_root_wallet_setup` | `setupId` | — |

## Workflow

1. Call `agentic_start_root_wallet_setup` — this generates an operator key pair and returns a `setupId` and `dashboardUrl`
2. Tell the user to open the `dashboardUrl` and deploy the wallet from their TON wallet
3. Poll `agentic_get_root_wallet_setup` with the `setupId` to check callback status
4. When status shows `callback_received`, or the user provides the wallet address manually, call `agentic_complete_root_wallet_setup`
5. Confirm the wallet is active with `get_current_wallet` or `list_wallets` (see `ton-manage-wallets` skill)

## How It Works

- The agent keeps the **operator private key** — it can sign transactions autonomously
- The user keeps the **owner key** — they can withdraw funds or revoke access at any time
- The wallet is an on-chain smart contract (NFT-based), not a custodial service
- The dashboard is at `agentic-wallets-dashboard.vercel.app`

## Environment Variables

| Variable | Description |
| -------- | ----------- |
| `NETWORK` | `mainnet` (default) or `testnet` |
| `AGENTIC_CALLBACK_BASE_URL` | Public URL for the onboarding callback (auto in HTTP mode) |
| `AGENTIC_CALLBACK_PORT` | Port for the callback server |

## Notes

- Callback state is persisted locally; use `AGENTIC_CALLBACK_BASE_URL` and/or `AGENTIC_CALLBACK_PORT` in stdio mode for a stable callback endpoint across restarts
- If the callback never arrives, the user can provide the wallet address manually to `agentic_complete_root_wallet_setup`
- After wallet creation, fund the wallet with TON before using transfer or swap skills
