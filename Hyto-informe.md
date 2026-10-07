# Hyto — project brief

Product behavior as of 7 October 2026 is in [README.md](README.md) and [AGENTS.md](AGENTS.md). This file keeps the pitch.

## Pitch

**Hyto removes the distrust from paying for work.** The payer's money is locked in a contract on Stellar before the work starts. The person doing it uploads photos, a PDF, or receipts as proof. Mile, the AI, reviews them, and the payment is released when the proof checks out and the organizer approves. Nobody pays blindly up front, and nobody works without knowing they will be paid.

Es: *Hyto resuelve la desconfianza al pagar por trabajos de voluntarios y al pedir viáticos. La plata de quien paga queda bloqueada en un contrato en blockchain, la persona sube fotos, PDF o facturas como prueba, una IA las revisa y el pago se libera cuando la prueba cumple. Así nadie paga por adelantado a ciegas y nadie trabaja sin saber si le van a pagar.*

**The strongest case is when the payer cannot be there.** In the blockchain world, a company or an ecosystem sends money to a community to run events, and it is never clear whether they happened, or checking takes a long time. With Hyto the money is locked, the community uploads photos and receipts, Mile reviews them, and the payment goes out only when the proof checks out. The same works for a job at home (cleaning, painting, a repair): the worker knows the money is already there, and the person paying does not pay before seeing the work.

**Who it fits best**

1. **Funding for communities and events**: companies, foundations, and blockchain ecosystems that pay a community to organize something they will not attend.
2. **Travel expenses (viáticos), stipends, and scholarships paid after the spend**: the organization sets a cap, the person spends and uploads the receipt, and Hyto pays what was really spent, up to the cap. This is the capped reimbursement task that already exists: Mile reads the total, the currency, and the date, the organizer confirms the amount, and the report shows every payment.
3. **Volunteer work**: short tasks proved by a photo (the ZEEK demo).
4. **Jobs at home or on site**: cleaning, painting, repairs, hired from someone who is not present.

The slogan stays **"Prove your worth. Get paid."**

Hyto is not [Ramp Network](https://rampnetwork.com), the crypto on/off-ramp researched in [docs/auditorias/2026-10-02-ramp-adaptation.md](docs/auditorias/2026-10-02-ramp-adaptation.md). Ramp Network sells mainnet USDC, not the testnet USDC Hyto locks, so it stays out of the demo.

## Hackathon context (September 2026)

| | |
|---|---|
| Event | Find Your Way Hackathon: Costa Rica, Stellar (Tellus Cooperative / Stellar Chile), Stellar Passport. General Track. |
| Delivery | Moved to 12 October 2026 (it was 5 October). |
| Meetup | 30 September 2026, TEC Cartago. |
| Demo and results | 12 October 2026. |
| Repo | https://github.com/Hyto-App/hyto |
| Team | Josué, Sebas, Abdiel Cole, Esteban, and Raúl. |

## How it works now

1. **Budget.** A signed-in user with enough USDC creates an event. Each task is its own escrow. The balance check is the task total plus 1 USDC.
2. **People.** Organizer invites teammates with a direct link or an `HYTO-` code. Members see their tasks. The organizer assigns work.
3. **Evidence.** A live camera photo of the work, or for a reimbursement the receipt as a photo, PDF, HTML, or text file.
4. **Review.** Mile: Groq (or Gemini) reads the evidence, Laya answers a questionnaire, and the code turns those answers into a grade from 0 to 100 with reasons. No model moves money.
5. **Pay.** The organizer confirms a reimbursement amount, locks the budget, then pays. The link appears after a real transaction hash. That hash is not in the repo yet. The demo mode shows the same steps without a wallet.

## Problem

In a lot of teams the money moves informally: a transfer, a chat message, a verbal reimbursement. At the end there is no report.

- The organizer cannot see what was spent or whether the task was done.
- The person who did the work has no committed payment.
- Sponsors and donors cannot check how the funds were used.
- A scholarship, stipend, or travel allowance is often paid up front with no receipts, or reimbursed weeks later by hand.
- A sponsor that funds a community event far away has no quick way to know it happened.
