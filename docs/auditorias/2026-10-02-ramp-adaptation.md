# Ramp Network → Hyto adaptation report

**Date:** 2 October 2026
**Audience:** Sebastián (Hyto)
**Scope:** Research only. No integration, no secrets, no mainnet cutover.
**Subject:** [Ramp Network](https://rampnetwork.com) (ramp.network), the crypto on/off-ramp. This is not [Ramp](https://ramp.com), the corporate card and spend product.

Hyto’s pitch line in `Hyto-informe.md` (“Ramp gave companies control of spend”) refers to the spend-control company. This report is about the other Ramp: the widget that buys and sells crypto. Do not merge the two in copy, partnerships, or the demo.

Spoken name in the brief: “Ito” means Hyto. The app UI is English. The evidence reviewer shown in the UI is **Mile** (“Mile only suggests. You approve every payment.”). Mile does not sign or move money.

---

## 1) Executive summary

Ramp Network is a **B2B2C on/off-ramp**. The end user pays Ramp. Ramp is the counterparty: the user buys from Ramp and sells to Ramp. Wallets and apps embed a widget or hosted page. Ramp also ships its own app. As of a 23 July 2026 post, that app’s Everyday Account holds **USDC on Stellar**.

The public asset catalog, fetched on 2 October 2026 with no partner key, lists **USDC on chain `XLM`**, enabled for both buy and sell, issued by Circle’s **mainnet** account `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`. That is not the asset Hyto uses. Hyto locks **Stellar testnet** USDC issued by `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, inside a **Trustless Work v2** contract that the project notes treat as testnet-only.

**Do not put Ramp in the Find Your Way / ZEEK demo** (delivery noted as 5 October 2026). Ramp’s published demo widget does not include Stellar testnet. A Ramp purchase delivers mainnet USDC, which cannot fund a testnet escrow. Mixing the two issuers would strand funds.

Ramp is a **fiat edge**, not a replacement for escrow. If Hyto ever uses it, the organizer would buy mainnet USDC into a Cavos `G…` account and only then lock a mainnet escrow. The volunteer would receive USDC at `wallet_cobro` and only then sell it. Ramp cannot be the milestone lock, the approver, or Mile.

For the amounts in the ZEEK sample (US$20 work, meal cap US$15), Ramp’s published fee floor (up to about €2.49 plus a percentage) is large relative to the payment. The unauthenticated currency catalog marks **only USD, EUR, and GBP** as available for off-ramp. Costa Rican colón, Mexican peso, Brazilian real, and Colombian peso are marked **on-ramp only** in that same snapshot. A 29 October 2024 Ramp post described MXN payouts via SPEI. That post and the live catalog disagree. Treat SPEI cash-out as **unconfirmed**.

**Recommendation:** keep the demo on testnet faucets and the existing lock-and-pay flow. After the demo, ask Ramp’s partnerships team the open questions in section 5 before any build. Do not plan a mainnet cutover from this report. Trustless Work v2, as recorded in `docs/AUDIT-2026-09-30.md`, is not a mainnet path. For volunteers who need cash in Latin America, [MoneyGram Ramps](https://xramps.moneygram.com/) is the closer Stellar-native option to compare, because it has a testnet sandbox and cash pickup. That comparison is not a decision to switch.

---

## 2) How Ramp works (findings)

### 2.1 Business model

Ramp Network sells the conversion itself. The [pricing policy](https://rampnetwork.com/pricing-policy) says Ramp is the counterparty on every transaction, whether the user is in the Ramp app or inside a partner wallet. The [partner terms](https://rampnetwork.com/partners-terms-conditions) (last updated 7 January 2026) say the integrator “does not in any way take part in the process of exchanging Fiat currency for Digital Assets.” The exchange is Ramp’s.

Who pays:

| Who | What they pay | Source |
|---|---|---|
| End user | Processing fee plus network fee, taken on the fiat side. On a buy, the user pays the quoted fiat and receives crypto net of fees. On a sell, the fiat received is net of fees. | [Pricing policy](https://rampnetwork.com/pricing-policy) |
| Integration partner | Optional “fee on top,” paid entirely to the partner. Shown to the user inside a single “Processing Fee.” Recommended below 1% where the commission program applies. | [Pricing policy](https://rampnetwork.com/pricing-policy), [partner commission](https://support.rampnetwork.com/en/articles/61154-how-can-i-earn-from-my-ramp-network-integration) |
| Low-volume partner | Annual maintenance fee of US$2,000 if yearly volume is under US$1,000,000, at Ramp’s discretion. The 2025 fee was reduced to US$1,000, invoiced January 2026. The July–December 2025 threshold was prorated to US$500,000. Non-refundable if the agreement ends. | [Partner terms, fees](https://rampnetwork.com/partners-terms-conditions) |

Channels:

- **Direct consumer:** Ramp app and website. The Everyday Account is this product, not an API Hyto can white-label.
- **Embedded:** SDK widget (overlay or in-page) or a hosted redirect. Ramp’s marketing says the widget is used by partner apps; the token-listing page says “250+ partner apps.” That count is Ramp’s claim, not independently audited here. [Token integration](https://rampnetwork.com/token-integration), [web quick start](https://docs.rampnetwork.com/web/quick-start-web).

Contracting entity, if there is no separate order form ([partner terms](https://rampnetwork.com/partners-terms-conditions)):

- United States: Ramp Swaps LLC, Miami.
- Listed EEA countries (including Ireland and Spain): Ramp Swaps (Ireland) Ltd, Central Bank of Ireland appears on the Everyday Account post as the regulator of that trading name.
- Everywhere else: Ramp Swaps Ltd, England and Wales.

A partner must pass Ramp’s due-diligence review (AML/KYC on the **business**). Failure ends the agreement. Marketing that uses Ramp’s name or logo needs prior written approval.

**Unknown:** Ramp does not publish a revenue split for the default processing fee. Custom partner pricing is “talk to partnerships” ([baseline fees](https://support.rampnetwork.com/en/articles/31326-what-are-the-baseline-fees-for-integration-partners)). Quotes from `POST /host-api/v3/onramp/quote/all` returned `hostApiKey must be a string` on 2 October 2026, so this report has **no live quote** for a US$20 Stellar USDC purchase.

### 2.2 On-ramp and off-ramp, including Stellar / USDC

Ramp buys crypto for the user (on-ramp), sells crypto for fiat (off-ramp), and swaps crypto for crypto. Delivery is to a self-custodial address (`userAddress` in the [configuration docs](https://docs.rampnetwork.com/configuration)).

**Live catalog snapshot, 2 October 2026**, unauthenticated:

- `GET https://api.rampnetwork.com/api/host-api/v3/assets`
- `GET https://api.rampnetwork.com/api/host-api/v3/offramp/assets`

Stellar rows (`chain: "XLM"`):

| Symbol | Name | On-ramp enabled | Off-ramp enabled | Address in the catalog | Decimals |
|---|---|---|---|---|---|
| XLM | Stellar Lumens | yes | yes | none (native) | 7 |
| USDC | USDC | yes | yes | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` | 7 |
| EURC | EURC | yes | yes | `GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2` | 7 |
| PYUSD | PYUSD | yes | yes | `GDQE7IXJ4HUHV6RQHIUPRJSEZE4DRS5WY577O2FY6YQ5LVWZ7JZTU2V5` | 7 |
| USDT0 | USDT0 | yes | off-ramp list included it as enabled | `GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q` | 7 |
| AQUA | Aquarius | yes | **not** in the off-ramp Stellar list | `GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA` | 7 |

The USDC address matches Circle’s published **mainnet** Stellar USDC (`USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`). Circle’s **Stellar testnet** USDC is `USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, which is the issuer in `lib/integrante/identidades.ts`. Sources: [Circle USDC addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses).

Catalog limits for that USDC row, denominated in the default EUR response (not a user quote):

- On-ramp min about **€6**, max about **€15,000**. `networkFee` field **0.01**.
- Off-ramp min about **€6.67**, max about **€15,111.81**.
- Response-level fee percents on the on-ramp payload: `minFeePercent` **0.99**, `maxFeePercent` **3.9**. These are catalog fields, not the pricing-policy table, and not a quote.

The help center (7 July 2026) lists Stellar among USDC networks for the US, the EU/EEA, and the UK/rest of world, with country and US-state overrides. In **Texas**, USDC cannot be bought or sold on any listed network, and the restricted list includes **Stellar**. [Supported assets](https://support.rampnetwork.com/en/articles/432-what-cryptoassets-does-ramp-network-support).

Ramp’s API labels Stellar tokens `type: "ERC20"`. That is Ramp’s bucket for non-native tokens. USDC on Stellar is a classic Stellar asset, not an Ethereum ERC-20. The address is a `G…` issuer, not a `0x` contract.

**Widget asset key:** docs use ids such as `BASE_USDC`. The public asset object is `symbol: USDC` plus `chain: XLM`. The exact string (`XLM_USDC` or something else) was **not confirmed**, because quotes require `hostApiKey`.

**Everyday Account (consumer), 23 July 2026:** Ramp moved the Everyday Account balance to USDC on Stellar. The post says sends settle in about five seconds, network fees are a fraction of a cent, and Ramp covers fees on Stellar sends. Users outside the EU can swap USDC on Base to USDC on Stellar at no fee. Earn stays on USDC on Base. The post says MoneyGram cash rails are “where we are headed next,” not a feature already in the account. Rollout was gradual. [Everyday Account on Stellar](https://rampnetwork.com/blog/everyday-account-now-on-stellar). The wallet help page (13 August 2026) repeats that the Everyday Account uses USDC on Stellar and that swap is not available in Europe. [Wallet assets](https://support.rampnetwork.com/en/articles/607893-supported-assets-list-ramp-network-wallet).

**Test environments:**

- Demo widget: `https://app.demo.rampnetwork.com`. API: `https://api.demo.rampnetwork.com/api`. Documented test networks: Ethereum Rinkeby, Matic Mumbai, Ronin, Celo Alfajores, Tezos Ghostnet, Flow, and Solana. Other assets are mocked. **Stellar is not in that list.** Several named networks are long-retired, so this page may be stale. [Testing environment](https://docs.rampnetwork.com/testing-environment).
- A separate staging environment exists and **does require KYC**. [Staging KYC](https://support.rampnetwork.com/en/articles/110152-does-the-staging-environment-require-me-to-do-a-kyc-verification).

**Unknown:** whether any Ramp environment can deliver Stellar **testnet** USDC. Nothing public found in this pass says yes.

### 2.3 UX patterns

On-ramp, from the docs and the pricing policy:

1. Partner opens the widget or sends the user to `https://app.rampnetwork.com` with `hostApiKey`, app name, and logo.
2. User picks or is pre-filled with country, fiat, amount, and crypto asset.
3. Quote refreshes about every 30 seconds until the transaction parameters are fixed. [Pricing policy](https://rampnetwork.com/pricing-policy).
4. User pays by card, Apple Pay, Google Pay, manual bank transfer, “easy” bank transfer, or Pix, where that method exists. `paymentMethodType` values in the [configuration docs](https://docs.rampnetwork.com/configuration): `MANUAL_BANK_TRANSFER`, `AUTO_BANK_TRANSFER`, `PIX`, `APPLE_PAY`, `GOOGLE_PAY`, `CARD_PAYMENT`.
5. KYC, if required for that user and amount (section 2.6).
6. Ramp sends the crypto to `userAddress`.

Off-ramp:

1. Widget must be enabled for `OFFRAMP` on the partner key. Default flow is on-ramp only. [Off-ramp](https://docs.rampnetwork.com/off-ramp).
2. **Manual:** user leaves the app and sends crypto to an address Ramp shows.
3. **Native:** `useSendCryptoCallback: true`. The widget emits amount, asset, and destination address. The host wallet sends the crypto and returns `{ txHash }`. Recommended for web apps that can sign; required for native mobile wallets. [Native flow](https://docs.rampnetwork.com/off-ramp-native-flow/general), [integration](https://docs.rampnetwork.com/off-ramp-native-flow/integration).

The callback payload in the docs is shaped like an EVM example (`amount` “in wei”, `address` `0x…`). Whether the same callback returns a Stellar `G…` destination, a memo, and 7-decimal stroops is **unknown**.

SPEI, as described on **29 October 2024** (may be out of date; see section 2.5): user selects crypto, country Mexico, currency MXN, method SPEI, enters the sending wallet, sends crypto to Ramp, and the post says MXN arrives in about 30 seconds. First time, the user enters CLABE, full name, and tax id. [SPEI post](https://rampnetwork.com/blog/ramp-network-spei).

Hosted mode can send the user back with `successUrl` / `failureUrl` (“Back to partner”). `finalUrl` is hosted on-ramp only. Webhooks: `webhookStatusUrl` for purchases, `offrampWebhookV3Url` for sales. [Events](https://docs.rampnetwork.com/events).

KYC UX, from Ramp’s own description: photo of a government id (front and back), country of residence, liveness (turn the head). The post says US customers cannot use a passport or residence permit. Ireland and the US require identity verification for any purchase. [KYC post](https://rampnetwork.com/blog/what-is-kyc-and-how-does-it-apply-to-ramp-network).

### 2.4 Integration options

Documented ways to embed ([quick start](https://docs.rampnetwork.com/web/quick-start-web)):

| Mode | What the partner does | Notes |
|---|---|---|
| Hosted | Link or redirect to `https://app.rampnetwork.com/?hostApiKey=…` | No SDK. Works on mobile. Crypto goes to `userAddress` if set. |
| Overlay | `@ramp-network/ramp-instant-sdk`, `new RampInstantSDK(config).show()`, `variant: "auto"` | Iframe over the app. |
| Embedded | Same SDK plus `containerNode`, variant `embedded-desktop` or `embedded-mobile` | Widget sits in a page element. |
| REST | `GET /host-api/v3/assets`, offramp assets, currencies; `POST …/onramp/quote/all` and `…/offramp/quote/all` | Quotes need `hostApiKey`. [V3 reference](https://docs.rampnetwork.com/rest-api-v3-reference). |
| Mobile | iOS, Android, React Native guides linked from the off-ramp page | Not reviewed line by line. |

API keys: request via Ramp’s form; support alias in the docs is `partner@ramp.network`. The key is passed into the widget so Ramp can attribute volume. It is an integration id, not a server secret, but it still must not be committed, and Hyto’s rule is not to add a new `NEXT_PUBLIC_` variable without telling the team. [API keys](https://docs.rampnetwork.com/api-keys).

There is no published “Ramp escrow” or “Ramp pays your contractors” API. Payout to a volunteer is: crypto already in their wallet, then an off-ramp, or they use the Ramp consumer app themselves.

### 2.5 Fees and pricing (public only)

Published processing schedule ([pricing policy](https://rampnetwork.com/pricing-policy)). “Up to” means the fee varies by country, method, asset, size, and partner. These are ceilings, not a quote for Hyto.

| Method | Minimum | Percentage |
|---|---|---|
| Manual bank transfer | up to €2.49 | up to 1.40% |
| Easy bank transfer | up to €2.49 | up to 2.40% |
| Card (USD, EUR, GBP) | up to €2.49 | up to 3.9% |
| Card (other currencies) | up to €2.49 local equivalent | up to 5.45% |
| Apple Pay / Google Pay | same as the underlying card | same as the card |
| Pix | up to €2.49 | up to 2.90% |

Network fee is set by the chain. Ramp says it does not keep it. On Stellar the catalog `networkFee` was 0.01 in the EUR asset response. The Everyday Account post says Ramp covers network fees on **its own** Stellar sends. That sentence is about the consumer account, not necessarily the partner widget.

SPEI post (29 October 2024): **flat 2.9%** on MXN payouts, described as lower than most MXN card fees. Not restated on the pricing-policy page retrieved for this report.

Illustration only, using the **ceiling**, not a live quote. A US$20 card buy in USD/EUR/GBP: up to 3.9% (about US$0.78) plus up to €2.49. The fixed part alone is on the order of 10–15% of a ZEEK task. A US$15 reimbursement is worse. A bank transfer has a lower percentage and the same style of minimum. Below the catalog minimum (about €6 of crypto), the widget may refuse the purchase. US$15–20 is above €6 at recent rates, so the minimum **amount** is probably not the blocker; the **fee floor** is.

Partner maintenance of US$1,000–2,000 per year (section 2.1) would dominate a hackathon or a handful of US$20 milestones.

**Unknown:** the fee Hyto’s users would actually see, PIX vs card in Brazil for a Stellar USDC buy, and whether the €2.49 minimum is waived for stablecoins.

### 2.6 Compliance, geography, KYC / AML

Ramp runs KYC on transactions. Higher totals pull in more documents. The pricing policy’s published thresholds (advanced checks can trigger earlier):

| Region | All purchases | Next step | Then | Then |
|---|---|---|---|---|
| United States | Id | Above US$5,000: id + proof of address | Above US$10,000: + source of wealth | Above US$20,000: + source of funds |
| Europe | Id | Above €5,000: id + proof of address | Above €10,000: + source of wealth | Above €20,000: + source of funds |
| Everywhere else in the policy | Id | Above €5,000: id + proof of address | Above €15,000: + source of wealth | Above €30,000: + source of funds |

Availability follows **physical location**, not citizenship. The help center says VPNs are not allowed. [Unsupported countries](https://support.rampnetwork.com/en/articles/433-which-countries-and-us-states-are-unsupported-for-buying-and-selling-crypto) (page said “updated this week” when fetched on 2 October 2026).

Latin American and Caribbean names **on that unsupported list** (services refused): Bolivia, Ecuador, Guatemala, Guyana, Haiti, Jamaica, Nicaragua, Panama, Suriname, Trinidad and Tobago, Venezuela. Also Belize, Cuba, and Puerto Rico. The full list is long and includes many non-LatAm jurisdictions; use the URL rather than a copy pasted into product code. Some places not on the list may still be **buy-only**.

US states with **no** Ramp service, from that page: Louisiana, Minnesota, Nevada, New Jersey, New York, Pennsylvania, Vermont, Washington. Puerto Rico is listed with territories. Texas allows other assets but blocks stablecoins, including USDC on Stellar (section 2.2).

EU/EEA: MiCA. The help center says USDT, USDT0, DAI, and AUSD are not available to buy or sell. USDC is among the stablecoins they say remain. [Supported assets](https://support.rampnetwork.com/en/articles/432-what-cryptoassets-does-ramp-network-support).

**Fiat catalog snapshot, 2 October 2026**, `GET /host-api/v3/currencies` (30 currencies). Off-ramp flag **true** only for **USD, EUR, GBP**. LatAm currencies in the list:

| Code | On-ramp | Off-ramp |
|---|---|---|
| MXN | yes | **no** |
| BRL | yes | **no** |
| COP | yes | **no** |
| PEN | yes | **no** |
| CRC | yes | **no** |
| DOP | yes | **no** |
| HNL | yes | **no** |
| PYG | yes | **no** |

Not in those 30 names: ARS, CLP, UYU, GTQ, NIO, and others. Absence is not proof the country is blocked (Argentina, Chile, Uruguay, and El Salvador were not on the unsupported-country list either). It does mean this catalog does not offer a local-currency payout there. **Costa Rica (CRC) is on-ramp only in this snapshot.** Find Your Way is in Costa Rica. A volunteer cannot cash a milestone out to colones through Ramp on the basis of this catalog.

The October 2024 SPEI article said Ramp already paid MXN via SPEI and would add SPEI **on-ramp** “in the coming weeks,” and that Brazil already had a PIX experience. The 2026 catalog shows the opposite shape for MXN and BRL: on-ramp yes, off-ramp no. **Open contradiction.** Do not tell volunteers that SPEI or PIX payouts work until Ramp confirms it in writing against a partner key.

Partner obligations that would land on Hyto if it embedded the widget: pass business due diligence, answer compliance requests within 72 hours, no sanctioned parties or sanctioned jurisdictions (the terms name Iran, North Korea, Sudan, South Sudan, Syria, Cuba, and Russia, non-exhaustive), tell Ramp about business-model changes, and do not advertise the widget without written approval. UK integrators have extra limits on “fee on top” and cannot run a zero-fee campaign for UK users. [Partner terms](https://rampnetwork.com/partners-terms-conditions).

**Unknown:** minimum age, whether a one-off event volunteer is accepted, Costa Rican or event-sponsor licensing if Hyto surfaces the widget, and whether Ramp’s “integrator does not exchange” sentence is enough in Costa Rica. This report is not legal advice.

### 2.7 Position versus alternatives relevant to LatAm and volunteer payouts

Hyto’s job is not “help a degen buy ETH.” It is “a person locks a small USDC budget, a volunteer does a task, USDC arrives, and they may need local money.” On that job:

| Option | What it is good at | Stellar USDC | Testnet story | Why it is or is not Ramp |
|---|---|---|---|---|
| **Ramp Network** | Card and bank **into** mainnet USDC on Stellar; consumer app already parks USDC on Stellar. Off-ramp in the public catalog is USD/EUR/GBP. | Yes, mainnet issuer, buy and sell enabled in the catalog | Demo widget docs do **not** list Stellar testnet | This report’s subject |
| **Ramp consumer app, no embed** | A person who already uses Everyday Account holds USDC on Stellar and can send it. | Yes, per the July 2026 post | Not a testnet faucet | Manual. No partnership. Do not use their logo without approval if a contract exists. Hyto would not see payment status. |
| **MoneyGram Ramps** | Cash in and cash out at agent locations. Stellar path is SEP-10 and SEP-24, in production since 2022. MoneyGram runs KYC. They say the partner does not need its own money-transmitter license for that stack. | USDC on Stellar. Widget docs tell you to use the issuer that matches `requiredNetwork`, and not to put the testnet issuer on a mainnet payload. | **TestNet sandbox** for Stellar. Playground vs production keys. | Stronger for unbanked cash-out and for a testnet dry run. Weaker as a “pay with a card in the review screen” on-ramp. [Product](https://xramps.moneygram.com/), [Stellar guide](https://xramps.moneygram.com/ops/developer/guides/stellar), [web guide](https://xramps.moneygram.com/ops/developer/guides/web-stellar). |
| **MoneyGram app stablecoin balance** | SDF and MoneyGram announced a multi-year extension. The app balance (Stellar, Circle USDC, Crossmint) was live in **Colombia**, then **El Salvador**, with more of Latin America planned. | Stellar USDC | Not Hyto’s testnet | Consumer cash-out, not an escrow. [SDF press](https://stellar.org/press/moneygram-and-stellar-extend-partnership-to-scale-real-world-stablecoin-utility-globally). Date of the release is the page’s; this report did not re-verify city-level agent coverage. |
| **Bitso Business, Bridge, BVNK, local payout APIs** | Secondary write-ups describe local rails (SPEI, Pix, PSE, CVU). | Not verified here | Not verified | [VelaFi comparison](https://www.velafi.com/blog/best-stablecoin-payment-providers-latam) is a vendor blog. Do not treat it as a decision. Primary docs were not reviewed in this pass. |
| **MoonPay, Transak, Coinbase Onramp** | Card on-ramps with published fee pages in other comparisons. | **Not checked** for Stellar USDC in this pass | Not checked | Irrelevant to the demo until someone confirms the asset and a testnet. |

MoneyGram’s public country list includes cash access in much of Latin America (Mexico, Brazil, Colombia, Costa Rica, Argentina, Chile, Peru, and others appear on the marketing page). Ramp’s unsupported list blocks several of those same countries entirely. The products are not substitutes.

---

## 3) Fit and gap versus Hyto

Current product, from `AGENTS.md` and `Hyto-informe.md` on `main` (this branch is cut from `8742508`). Where those files and the code disagree, the code wins; the points below were checked against both.

Hyto locks a budget and pays milestones on **Stellar testnet**. **One Trustless Work v2 multi-release contract per task.** The organizer’s session wallet must cover the sum of task amounts plus a **1 USDC** reserve (`RESERVA_USDC` in `lib/escrow/saldo.ts`) before creating an event. A member uploads a photo. Groq describes it. Laya scores it when `LAYA_URL` is set. The UI calls that suggestion **Mile**. The organizer confirms a reimbursement, locks the budget, and pays the **full** milestone. Mile does not sign.

Lock budget is deploy then fund. Pay is mark, approve, release. The browser signs with Cavos `wallet.signXdr`. The server submits to Trustless Work. USDC in code is testnet issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. `HYTO_STELLAR_NETWORK=public` or `mainnet` only points the **balance read** at public Horizon. The escrow API stays on `https://beta.api.trustlesswork.com`. Platform fee in the contract is 0. There is still no real payment hash in the repo. Demo sessions cannot sign.

ZEEK sample in `lib/admin/ejemplo.ts`: “Set up the booth,” “Check-in list,” and “Welcome table” at US$20; “Team meal” cap US$15. Find Your Way delivery in the project brief: **5 October 2026**.

### Volunteer receives pay

| Hyto today | Ramp | Gap |
|---|---|---|
| After approval, Trustless release sends testnet USDC to `wallet_cobro` (a `G…` the assigned member set). The receiver needs a USDC trustline. Deploy is rejected with `ESCROW_RECEIVER_TRUSTLINE_MISSING` if it is missing. Hyto does not preflight that yet. | Off-ramp starts from crypto the user already holds, then fiat to a bank (or, in the 2024 post, SPEI). Destination of the **crypto** leg is Ramp’s address, not the volunteer’s. | Ramp does not pay the volunteer. The escrow does. Ramp can only convert what already arrived. |
| Amounts are US$15–20. | Fee floor is large next to that (section 2.5). Catalog minimum is about €6. | A cash-out of one meal can cost a few dollars. That fights the “almost no fee” story of a Stellar transfer. |
| Demo users are at a Costa Rica event. CRC is on-ramp only in the public fiat catalog. | No published SINPE payout. | Do not promise colones. |
| Wallet ownership is not proven with a signed nonce. `wallet_cobro` can still change after deploy (`AGENTS.md`). | Off-ramp KYC is on the Ramp customer, not on Hyto’s session. | Even later, do not send a Ramp cash-out at a wallet Hyto has not proven the volunteer controls. |

### Organizer funds the budget

| Hyto today | Ramp | Gap |
|---|---|---|
| Organizer needs testnet XLM (fees) and testnet USDC, then deploy + fund. Friendbot covers testnet XLM. | On-ramp buys **mainnet** USDC (Circle issuer `GA5ZSE…`) into `userAddress`. | Useless for the testnet escrow. A mainnet payment cannot be funded into the beta Trustless contract. |
| Balance check is task total + 1 USDC. | User chooses the fiat amount. Fees come out of the crypto on a buy (“pay €100, receive less than €100 of the asset”). | If someone later buys “US$20” they will lock **less than** US$20 unless the quote is grossed up. The 1 USDC reserve makes the shortfall worse. |
| Escrow address is a contract `C…`. Funding is a Trustless `fondear` from the organizer `G…`, not a classic payment to the contract from an external ramp. | `userAddress` is documented as the buyer’s blockchain address. Contract destinations are **not** documented. | Ramp must target the organizer `G…`, never the escrow `C…`, unless Ramp confirms contract delivery in writing. |
| Creating an event already requires the USDC to be on the session wallet. | A widget is an extra step **before** create, on a network Hyto does not use yet. | No UI place for it in the demo. |

### Escrow release

Ramp does not map onto mark / approve / release. Those stay Trustless Work + Cavos. A Ramp webhook must not be treated as “the milestone was approved.” Mile stays a suggestion. The organizer still pays.

`docs/AUDIT-2026-09-30.md` records Trustless Work’s own constitution: v2 is beta and “never on mainnet”; v1 is the production default. Hyto hardcodes the v2 beta base. Any Ramp mainnet USDC plan is blocked on a **different escrow stack**, a different USDC issuer, and an explicit decision. This report does not make that decision.

---

## 4) Adaptation recommendations

Phased. Phase A is the only phase that matches the demo. Phases B and C are research and a design note. They are not a build ticket and not a mainnet cutover.

### Phase A — demo / testnet (now, through Find Your Way)

**Build nothing Ramp-shaped.**

- Keep funding on Stellar testnet: Friendbot for XLM, Circle testnet USDC (`GBBD47…`), Cavos, Trustless Work v2, lock budget, Mile, organizer pay.
- Do not load `@ramp-network/ramp-instant-sdk`, do not redirect to `app.rampnetwork.com`, and do not point `userAddress` at a testnet `G…`. Ramp will not deliver `GBBD47` USDC.
- Do not tell demo volunteers they can cash out with Ramp, SPEI, PIX, or SINPE.
- In the pitch, say “spend controls” if the line is about the other Ramp. If the line stays, be ready to explain it is not this company. Do not put Ramp Network’s logo on the hackathon slide unless they have approved it. There is no partnership.

Manual fallback if a judge asks “how does fiat get in” : “Not in this demo. The demo uses testnet USDC. A production on-ramp would buy Circle mainnet USDC on Stellar into the organizer’s wallet, and only then lock escrow. We have not turned that on.”

### Phase B — after the demo, still no mainnet

**Partner, don’t build an on-ramp.** Building KYC, cards, and local payouts is a money-transmitter problem. Ramp’s terms exist so the integrator does not do the exchange. MoneyGram’s Stellar docs are the other “don’t become the MSB” path, with a testnet sandbox Hyto could actually point at testnet USDC.

Before any design work, email `partner@ramp.network` and ask, in writing:

1. Widget asset id for Circle USDC on Stellar, and confirmation the issuer is `GA5ZSE…` only.
2. Is Stellar testnet USDC (`GBBD47…`) available in any environment? If no, say so in the reply and stop.
3. Off-ramp today for CRC, MXN, BRL, and COP, and the payment rail (SPEI, PIX, SINPE, card, wire). The public catalog on 2 October 2026 said no for all four.
4. Fee quote for a US$20 and a US$15 Stellar USDC buy and sell, USD card and the local rail, including the minimum fee.
5. Whether the maintenance fee applies under US$1,000,000 a year, and whether a hackathon project can get it waived.
6. `onSendCrypto` for Stellar: destination `G…`, memo required or not, amount decimals (catalog says 7), and a sample payload.
7. Can `userAddress` be a Soroban `C…`? Expect no.
8. Countries they will actually serve for a Costa Rica event with foreign volunteers (location, not passport).

In parallel, read MoneyGram’s Stellar sandbox only as a **comparison**, not as a second integration. It is the option that matches “USDC on Stellar, including testnet, cash at the end.” Ramp is the option that matches “card in, mainnet USDC on Stellar.”

Do not add environment variables. Do not store a host API key in the repo.

### Phase C — production design (only after an explicit mainnet decision)

This is a sketch so a later change does not invent the flow. It is blocked by Trustless v2 being testnet-only in the audit note, by wallet-proof gaps, and by the issuer change. **Do not schedule a cutover from this document.**

Build versus partner: **partner**. Hyto keeps escrow, Mile, and the report. Ramp, if chosen, is only the fiat door, and only on mainnet USDC after the escrow stack has a mainnet path (the audit points at Trustless v1, not at “flip `HYTO_STELLAR_NETWORK`”).

UX, English copy, spoken “Ito”:

1. **Organizer, Account, and only on a mainnet build.** “Add USDC” opens **hosted** Ramp in a new tab (`variant` hosted), not an iframe on the signing screen. Prefill: on-ramp, USDC on Stellar, `userAddress` = the session `G…` (never the escrow), amount = task total + 1 USDC reserve **grossed up** for fees so the wallet receives at least that crypto. `successUrl` returns to the event. Then the existing lock-budget steps. If the received balance is short, say so. Do not auto-deploy.
2. **Volunteer, after the task is paid and `hash_pago` exists.** “Cash out” only if their country is on a list Ramp confirmed for **off-ramp**. Otherwise: “You were paid in USDC on Stellar” plus the existing explorer link. No SPEI/PIX/SINPE copy until confirmed.
3. Off-ramp signing: prefer `useSendCryptoCallback` so Cavos signs a **classic USDC payment** (7 decimals) to Ramp’s `G…`, with memo if Ramp requires one. If the callback is EVM-only, use manual send and show the destination, amount, and memo in Hyto before the user leaves. Do not reuse the escrow `signXdr` path for that payment without a separate prepared transaction.
4. KYC stays inside Ramp. Hyto does not collect id photos. Tell the user they will verify their identity with Ramp. One-off volunteers may abandon here. That is a product cost, not something to bypass.
5. Webhooks, if added later, update a “fiat settled” note on the task. They must not set `pagado` or replace `hash_pago`.
6. Gate the buttons on an explicit production flag. `HYTO_STELLAR_NETWORK` as implemented does **not** move the escrow. A hidden query param is not good enough.

Compliance caveats to keep next to any future button:

- Hyto would be a Ramp **integrator** and must pass their business KYC. Budget the maintenance fee or get a waiver.
- Users in unsupported countries get nothing. Location is what Ramp checks.
- Texas and the listed US states cannot buy or sell USDC on Stellar through Ramp.
- EU users may be limited to MiCA-eligible stablecoins. USDC is in Ramp’s allowed set; do not offer USDT0 on Stellar to EEA users.
- Sanctions language in the partner terms binds the integrator.
- Trademark: no Ramp logo in the Figma file until they approve the screen.
- Age and event-volunteer policy: unknown. Do not assume a student volunteer can pass KYC.
- This is not a legal opinion on Costa Rica, SINPE, or sponsoring an event.

What not to do even in Phase C:

- Do not let Mile, or a Ramp webhook, release the escrow.
- Do not fund the `C…` contract from the widget.
- Do not swap testnet and mainnet issuers in one wallet or one env.
- Do not add a `NEXT_PUBLIC_` Ramp key without a team note. The widget key is visible to the browser by design; the server webhook URL can stay server-side.
- Do not drop Trustless Work to “just send USDC via Ramp.” That removes the lock-before-work premise.

---

## 5) Risks, blockers, open questions

**Blockers for any integration before or during the demo**

- Asset mismatch: Ramp catalog USDC is Circle mainnet; Hyto is Circle testnet.
- Ramp demo docs do not list Stellar testnet, and the listed testnets look stale.
- Trustless Work v2 beta is the escrow Hyto ships, and the audit records it as not a mainnet product.
- Find Your Way delivery is 5 October 2026. There is no time to do partner KYC, and no reason to.

**Product and money risks if someone skips the phases**

- Fee floor versus US$15–20 milestones. Volunteers would see a “payment app” take a visible cut of a meal.
- Buy-side fees reduce crypto received. Lock-budget would fail or underfund if the organizer bought the face amount.
- Public off-ramp list is USD/EUR/GBP only. The SPEI blog is 2024 and conflicts with the 2026 currency catalog. A LatAm volunteer payout story is not supported by the live catalog.
- CRC on-ramp only. The hackathon country has no Ramp colón cash-out in that catalog.
- Unsupported-country list drops several LatAm countries entirely. A regional volunteer team will have holes.
- Partner maintenance fee can exceed a year of demo volume.
- `onSendCrypto` might be EVM-shaped. A wrong decimal (6, 7, or 18) sends the wrong amount. A missing Stellar memo fails the off-ramp after the user has already paid on-chain.
- Sending mainnet USDC to a testnet account, or the reverse, loses the payment. The issuers are different `G…` values and must be shown before signing.
- Everyday Account “we cover Stellar fees” is the consumer app, not a promise about the widget.
- Wallet-proof and trustline preflight are still open in `AGENTS.md`. An off-ramp on top of an unproven `wallet_cobro` pays the wrong person.
- Name collision with corporate Ramp in the existing pitch. A partner or a judge can think Hyto claims a relationship it does not have.

**Open questions**

- Exact widget id for Stellar USDC, and a real quote at US$20 / US$15.
- Is MXN SPEI off-ramp still live for a partner key, or did it end?
- Does PIX on the pricing page mean BRL **on-ramp** only, matching the catalog?
- Stellar memo, decimals, and `C…` destinations.
- Minimum age and accepted id types in Costa Rica.
- Will Ramp waive the maintenance fee under US$1,000,000?
- Is the demo-widget page still accurate, or has a Stellar testnet been added without a docs update?
- For cash-out at an event, does MoneyGram’s Costa Rica agent coverage beat a card ramp? Not measured here.
- Bitso / Bridge / local payout APIs: primary docs not reviewed.

---

## 6) Sources

Fetched or called on **2 October 2026** unless the page itself carries an older date. No non-public credentials. The asset and currency tables are from unauthenticated GETs and can change by country, IP, and partner key.

**Ramp Network, primary**

- Pricing policy: https://rampnetwork.com/pricing-policy
- Partner terms (updated 7 January 2026): https://rampnetwork.com/partners-terms-conditions
- Everyday Account on Stellar (Nick Marchenko, 23 July 2026): https://rampnetwork.com/blog/everyday-account-now-on-stellar
- SPEI / MXN (Nick Marchenko, 29 October 2024): https://rampnetwork.com/blog/ramp-network-spei
- KYC explainer (30 October 2024): https://rampnetwork.com/blog/what-is-kyc-and-how-does-it-apply-to-ramp-network
- Supported assets help (7 July 2026): https://support.rampnetwork.com/en/articles/432-what-cryptoassets-does-ramp-network-support
- Unsupported countries and US states: https://support.rampnetwork.com/en/articles/433-which-countries-and-us-states-are-unsupported-for-buying-and-selling-crypto
- Wallet / Everyday Account networks (13 August 2026): https://support.rampnetwork.com/en/articles/607893-supported-assets-list-ramp-network-wallet
- Partner commission: https://support.rampnetwork.com/en/articles/61154-how-can-i-earn-from-my-ramp-network-integration
- Partner baseline fees: https://support.rampnetwork.com/en/articles/31326-what-are-the-baseline-fees-for-integration-partners
- Token and chain listing (“250+ partner apps”): https://rampnetwork.com/token-integration
- Web quick start (hosted, overlay, embedded): https://docs.rampnetwork.com/web/quick-start-web
- Hosted mode: https://docs.rampnetwork.com/web/quick-start-hosted
- Configuration (`userAddress`, flows, unified asset params, `useSendCryptoCallback`): https://docs.rampnetwork.com/configuration
- API keys: https://docs.rampnetwork.com/api-keys
- SDK reference: https://docs.rampnetwork.com/sdk-reference
- Events and webhooks: https://docs.rampnetwork.com/events
- REST API v3: https://docs.rampnetwork.com/rest-api-v3-reference
- Off-ramp: https://docs.rampnetwork.com/off-ramp
- Off-ramp native flow: https://docs.rampnetwork.com/off-ramp-native-flow/general
- Off-ramp native integration (`SEND_CRYPTO` payload): https://docs.rampnetwork.com/off-ramp-native-flow/integration
- Testing environment: https://docs.rampnetwork.com/testing-environment
- Staging KYC: https://support.rampnetwork.com/en/articles/110152-does-the-staging-environment-require-me-to-do-a-kyc-verification
- Live catalog (no key), 2 October 2026:
  - `GET https://api.rampnetwork.com/api/host-api/v3/assets`
  - `GET https://api.rampnetwork.com/api/host-api/v3/offramp/assets`
  - `GET https://api.rampnetwork.com/api/host-api/v3/currencies`
  - `POST https://api.rampnetwork.com/api/host-api/v3/onramp/quote/all` rejected without `hostApiKey`

**Stellar / USDC / cash ramps**

- Circle USDC contract addresses (mainnet `GA5ZSE…`, Stellar testnet `GBBD47…`): https://developers.circle.com/stablecoins/usdc-contract-addresses
- Stellar asset trustlines (cited from current `AGENTS.md`): https://developers.stellar.org/docs/tokens/anatomy-of-an-asset
- Friendbot / networks (cited from current `AGENTS.md`): https://developers.stellar.org/docs/networks#friendbot
- MoneyGram Ramps product: https://xramps.moneygram.com/
- MoneyGram Stellar SEP-24 guide: https://xramps.moneygram.com/ops/developer/guides/stellar
- MoneyGram web widget (Stellar USDC, testnet vs mainnet issuer): https://xramps.moneygram.com/ops/developer/guides/web-stellar
- SDF press, MoneyGram partnership extension (Colombia, El Salvador): https://stellar.org/press/moneygram-and-stellar-extend-partnership-to-scale-real-world-stablecoin-utility-globally

**Hyto (do not treat older write-ups as current)**

- `AGENTS.md` on `main` (describes `2b9fad4`, 2 October 2026): testnet, one v2 contract per task, ZEEK amounts, Cavos, Mile’s stack (Groq + Laya), `HYTO_STELLAR_NETWORK` does not move the escrow API.
- `Hyto-informe.md`: pitch line, Find Your Way dates, “Ramp” as spend-control metaphor.
- `lib/integrante/identidades.ts`: testnet USDC issuer.
- `lib/admin/ejemplo.ts`: US$20 / US$15 sample tasks.
- `lib/escrow/saldo.ts`: `RESERVA_USDC` of 1.
- `docs/AUDIT-2026-09-30.md` item E5: Trustless Work v2 beta, not a blind mainnet path; mainnet USDC issuer called out as `GA5ZSE…`.
- UI copy: `components/admin/Bandeja.tsx` (“Mile only suggests”), `components/admin/Revision.tsx` (“Mile is unavailable”).

**Secondary (not used as a decision)**

- VelaFi, “stablecoin payment providers for LATAM”: https://www.velafi.com/blog/best-stablecoin-payment-providers-latam

**Method limit**

Stellar Raven (https://raven.stellar.org/mcp) requires browser OAuth. This run could not sign in. Stellar facts used here are the ones already recorded in `AGENTS.md` (checked 2026-10-02) plus Circle’s public address list and MoneyGram’s public docs. Nothing in this file is a Raven tool transcript.
