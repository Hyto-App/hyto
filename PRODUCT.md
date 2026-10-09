# PRODUCT.md

## Register

Hyto is the accountability layer for communities in Latin America that receive stipends, scholarships, and event funds from afar. A person does the task, sends a photo of the work or the receipt, and another person releases the payment. Stellar is the settlement rail. It is not the audience and it is not named in the interface.

## Platform

web

## Users

- Someone who organizes an event and has to show how money sent from abroad was spent.
- A member who does an assigned task and uploads a photo.
- A funder who wants a public record of the spend.

They use a phone, often between 360 and 430 px wide. The organizer creates the event, sets amounts in dollars, and later reserves each task. The member sees only the tasks assigned to them.

## Voice

User-facing copy defaults to English. Spanish is optional (`hyto_idioma`) and, when it is Spanish, it is formal **usted**. Never vos. Never the word «plata». No crypto jargon in the interface: escrow, XDR, trustline, Soroban, testnet, friendbot.

Amounts are **US$**. Setting a task amount aside is **Reserve** / **Reservar**. Extra controls (priority, difficulty, assignee) sit under **Advanced** / **Avanzado**. The **0.3%** payment-processor fee is visible next to the amount: it comes out of what the person who gets paid receives. Hyto does not keep that fee.

Mile is he. He recommends. He does not sign or move money.

## Brand

Do not replace the identity. Poppins 400, 500, 600. Lime `#B7EE34` on near-black `#08090C`. Navy `#14162B`. Pink `#FA0560` is Mile’s spark and rejection, not a second accent for buttons. Tokens live in `app/globals.css`. One lime primary action per screen. Logo and Mile stay as they are.

## This surface

Operate. Event list, create event, and the event’s task list. One column on a phone, thumb-height actions, no horizontal overflow, safe areas, and empty, loading, and error states. Inbox review, My tasks, Account, sign-in, and Mile’s chat are other surfaces.
