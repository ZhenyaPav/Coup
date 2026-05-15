# Coup AI Rules

This document is a gameplay + API playbook for the AI agent.

## Match Format Implemented Here

- Game: Coup
- Players: exactly 2 (`human`, `ai`)
- Server is authoritative for all rules
- Single in-memory match (`gameId: default`)
- Two-player starting coin adjustment is active:
  - Starting player: 1 coin
  - Other player: 2 coins

## Objective

Be the last player with at least one unrevealed influence card.

## AI Disclosure Constraint

- Do not reveal to the human opponent any hidden cards, private hand details, or internal reasoning that depends on hidden information.

## Core Rules Summary

### Influence and elimination

- Each player has 2 influence cards.
- When you lose influence, you reveal one hidden card.
- If both cards are revealed, you are eliminated.

### Turn rule

- On your turn, take exactly one action.
- If you start your turn with 10+ coins, you must `coup`.

### Actions

- `income`: gain 1 coin
- `foreign_aid`: gain 2 coins (can be blocked by Duke)
- `coup`: pay 7, target loses 1 influence (cannot be blocked/challenged)
- `tax` (Duke claim): gain 3
- `assassinate` (Assassin claim): pay 3, target loses 1 influence if not blocked
- `steal` (Captain claim): take up to 2 from target
- `exchange` (Ambassador claim): draw 2, choose what to keep

### Counteractions (blocks)

- Duke blocks `foreign_aid`
- Contessa blocks `assassinate` (target only)
- Captain or Ambassador block `steal` (target only)

### Challenges

Any character claim (action/block) may be challenged.

- If challenged player proves claim:
  - challenger loses 1 influence
  - proven card is shuffled back and replaced
- If challenged player fails claim:
  - challenged claim fails
  - challenged player loses 1 influence

## API Contract For The Agent

Base URL examples below assume `http://localhost:8080`.

### 1) Start/reset game

`POST /api/game/new`

Optional body:

```json
{ "startingPlayer": "human", "viewer": "ai" }
```

`viewer` is required and controls which player's private cards are visible in the returned state.

### 2) Read AI view of state

`GET /api/game/state?viewer=ai`

Response contains:

- `state.phase`
- `state.currentPlayer`
- `state.nextInstruction` (plain-text instruction about who should act next)
- `state.players`
- `state.pendingAction`
- `state.pendingBlock`
- `state.legalMoves` (authoritative list of currently allowed moves)
- `state.isYourTurn`
- `state.waitingReason`
- `state.log`

Important: hidden opponent cards are masked in this view.

Example `state.nextInstruction` values for AI view:

- `AI action is expected. Call POST /api/game/action with one legal move.`
- `Wait. Human action is expected.`
- `Game over. No action needed.`

### 3) Submit a move

`POST /api/game/action`

Body:

```json
{
  "viewer": "ai",
  "move": { "type": "declare_action", "action": "income" }
}
```

### 4) Fetch this rules document from API

`GET /api/rules`

Returns this markdown as `text/markdown`.

### 5) Health

`GET /api/health`

Returns:

```json
{ "ok": true }
```

## Move Payload Shapes

- `{"type":"declare_action","action":"income"}`
- `{"type":"declare_action","action":"foreign_aid"}`
- `{"type":"declare_action","action":"tax"}`
- `{"type":"declare_action","action":"exchange"}`
- `{"type":"declare_action","action":"steal","target":"human"}`
- `{"type":"declare_action","action":"assassinate","target":"human"}`
- `{"type":"declare_action","action":"coup","target":"human"}`
- `{"type":"challenge_action"}`
- `{"type":"block","as":"duke"}` (or `contessa`, `captain`, `ambassador` as legal)
- `{"type":"challenge_block"}`
- `{"type":"allow"}`
- `{"type":"choose_influence_to_reveal","cardId":"c12"}`
- `{"type":"choose_exchange","keepCardIds":["c3","c8"]}`

Note: `allow` is still a move and must be sent via `POST /api/game/action` like any other move.

## Error Handling

- `409` + `NOT_YOUR_TURN`: you acted outside your turn/decision window.
- `422` + `ILLEGAL_MOVE`: move not legal in current state.
- `409` + `GAME_OVER`: game already finished.

The agent should handle these as non-fatal and re-sync via state fetch.

## Recommended AI Loop

1. Call `GET /api/game/state?viewer=ai` once to get initial state.
2. If `state.nextInstruction` says game is over, stop.
3. If `state.nextInstruction` says AI action is expected, choose exactly one move from `state.legalMoves`.
4. Submit via `POST /api/game/action` and use the returned `state` as the next state.
5. Repeat from step 2 using that latest returned state.
6. If `state.nextInstruction` says wait for human, do not call a dedicated turn-check endpoint; wait for the next trigger/event, or poll `GET /api/game/state?viewer=ai` only when no fresh state is available.

Important turn semantics:

- Do not assume your turn ends after one submitted move.
- Your turn may continue into follow-up decision windows (`challenge_action`, `block`, `challenge_block`, `allow`, `choose_influence_to_reveal`, `choose_exchange`) depending on phase.
- Always trust the latest `state.nextInstruction` and `state.legalMoves`, not assumptions.

Never invent moves outside `state.legalMoves`.

## Curl Examples

### New game

```bash
curl -s -X POST http://localhost:8080/api/game/new \
  -H 'content-type: application/json' \
  -d '{"startingPlayer":"human","viewer":"ai"}'
```

### Get AI state

```bash
curl -s 'http://localhost:8080/api/game/state?viewer=ai'
```

### AI plays income

```bash
curl -s -X POST http://localhost:8080/api/game/action \
  -H 'content-type: application/json' \
  -d '{"viewer":"ai","move":{"type":"declare_action","action":"income"}}'
```

### AI challenges opponent action

```bash
curl -s -X POST http://localhost:8080/api/game/action \
  -H 'content-type: application/json' \
  -d '{"viewer":"ai","move":{"type":"challenge_action"}}'
```

### AI blocks as Contessa

```bash
curl -s -X POST http://localhost:8080/api/game/action \
  -H 'content-type: application/json' \
  -d '{"viewer":"ai","move":{"type":"block","as":"contessa"}}'
```

### AI reveals selected card

```bash
curl -s -X POST http://localhost:8080/api/game/action \
  -H 'content-type: application/json' \
  -d '{"viewer":"ai","move":{"type":"choose_influence_to_reveal","cardId":"c7"}}'
```

### AI chooses exchange cards

```bash
curl -s -X POST http://localhost:8080/api/game/action \
  -H 'content-type: application/json' \
  -d '{"viewer":"ai","move":{"type":"choose_exchange","keepCardIds":["c4","c9"]}}'
```

### Read rules through API

```bash
curl -s http://localhost:8080/api/rules
```
