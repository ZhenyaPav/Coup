# Coup AI Rules

Gameplay/API contract for the `ai` player. The server is authoritative; use `state.legalMoves`.

## Match

- Players: exactly 2 (`human`, `ai`), single in-memory game (`default`).
- Objective: be the last player with at least one unrevealed influence.
- Setup: each player has 2 influence cards. Starting player gets 1 coin; other player gets 2.
- Privacy: never reveal hidden cards, private hand details, or hidden-information reasoning to the human.

## Rules

- On your turn, take one action. If you start with 10+ coins, you must `coup`.
- Losing influence means revealing one hidden card. Revealing both cards eliminates you.
- Claims for `tax`, `assassinate`, `steal`, `exchange`, and blocks may be challenged.
- If a challenged player proves the claim, the challenger loses 1 influence and the proven card is shuffled back/replaced.
- If a challenged player fails, their claim fails and they lose 1 influence.

Actions:

- `income`: gain 1 coin.
- `foreign_aid`: gain 2 coins; blockable by Duke.
- `coup`: pay 7; target loses 1 influence; cannot be blocked/challenged.
- `tax` / Duke: gain 3.
- `assassinate` / Assassin: pay 3; target loses 1 influence unless blocked by Contessa.
- `steal` / Captain: take up to 2 coins from target; blockable by Captain or Ambassador.
- `exchange` / Ambassador: draw 2, inspect them, keep as many cards as you have unrevealed influence, return the rest.

## API

Base URL examples use `http://localhost:8080`.

- Start/reset: `POST http://localhost:8080/api/game/new` with `{"startingPlayer":"human","viewer":"ai"}`.
- Read AI state: `GET http://localhost:8080/api/game/state?viewer=ai`.
- Submit move: `POST http://localhost:8080/api/game/action` with `{"viewer":"ai","move":<one exact legal move>}`.
- Read this document: `GET http://localhost:8080/api/rules`.
- Health: `GET http://localhost:8080/api/health`.

State fields to rely on:

- `state.isYourTurn`: true when the AI must act.
- `state.legalMoves`: authoritative list of valid moves. Choose one exact object from this list.
- `state.nextInstruction`: human-readable status.
- `state.players`: includes AI private cards; opponent hidden cards are masked.
- `state.pendingAction`, `state.pendingBlock`, `state.waitingReason`, `state.log`.

## Required AI Loop

1. Call `GET /api/game/state?viewer=ai`.
2. If game over, stop.
3. If `state.isYourTurn` is `false`, wait for the human or poll later.
4. If `state.isYourTurn` is `true`, choose exactly one object from `state.legalMoves`.
5. Call `POST /api/game/action` with that exact move object.
6. Use the returned state and repeat from step 2.

Do not answer with only prose, strategy, or a JSON snippet when `state.isYourTurn` is `true`. The decision is incomplete until `/api/game/action` succeeds.

Do not assume a submitted move ends your turn. Follow-up decisions may be required: `challenge_action`, `block`, `challenge_block`, `allow`, `choose_influence_to_reveal`, or `choose_exchange`.

Never invent, rename, simplify, or partially reconstruct moves. This matters for generated card IDs in `choose_influence_to_reveal` and `choose_exchange`. `allow` is also a move and must be posted.

## Move Shapes

- `{"type":"declare_action","action":"income"}`
- `{"type":"declare_action","action":"foreign_aid"}`
- `{"type":"declare_action","action":"tax"}`
- `{"type":"declare_action","action":"exchange"}`
- `{"type":"declare_action","action":"steal","target":"human"}`
- `{"type":"declare_action","action":"assassinate","target":"human"}`
- `{"type":"declare_action","action":"coup","target":"human"}`
- `{"type":"challenge_action"}`
- `{"type":"block","as":"duke"}` or `contessa`, `captain`, `ambassador`
- `{"type":"challenge_block"}`
- `{"type":"allow"}`
- `{"type":"choose_influence_to_reveal","cardId":"c12"}`
- `{"type":"choose_exchange","keepCardIds":["c3","c8"]}`

## Errors

- `409 NOT_YOUR_TURN`: acted outside the AI decision window.
- `422 ILLEGAL_MOVE`: move not in `state.legalMoves`.
- `409 GAME_OVER`: game already finished.

On any error, re-sync with `GET /api/game/state?viewer=ai`.

## Tool Calling

If using a tool/function framework, register `POST /api/game/action` as a required tool when `state.isYourTurn` is `true`.

Recommended tool:

- Name: `submit_coup_move`
- Arguments: `{ "viewer": "ai", "move": <one exact item from state.legalMoves> }`

Natural-language instructions alone are not enough for all agents; the orchestrator should require a real action call during AI decision windows.

## Minimal Curl

```bash
curl -s 'http://localhost:8080/api/game/state?viewer=ai'

curl -s -X POST http://localhost:8080/api/game/action \
  -H 'content-type: application/json' \
  -d '{"viewer":"ai","move":{"type":"declare_action","action":"income"}}'
```
