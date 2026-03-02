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
{ "startingPlayer": "human" }
```

### 2) Read AI view of state

`GET /api/game/state?viewer=ai`

Response contains:

- `state.phase`
- `state.currentPlayer`
- `state.players`
- `state.pendingAction`
- `state.pendingBlock`
- `state.legalMoves` (authoritative list of currently allowed moves)
- `state.isYourTurn`
- `state.waitingReason`
- `state.log`

Important: hidden opponent cards are masked in this view.

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

## Error Handling

- `409` + `NOT_YOUR_TURN`: you acted outside your turn/decision window.
- `422` + `ILLEGAL_MOVE`: move not legal in current state.
- `409` + `GAME_OVER`: game already finished.

The agent should handle these as non-fatal and re-sync via state fetch.

## Recommended AI Loop

1. Call `GET /api/game/state?viewer=ai`.
2. If `state.phase == "game_over"`, stop.
3. If `state.isYourTurn == false`, sleep briefly and poll again.
4. Select one move from `state.legalMoves`.
5. Submit via `POST /api/game/action`.
6. Repeat.

Never invent moves outside `state.legalMoves`.

## Curl Examples

### New game

```bash
curl -s -X POST http://localhost:8080/api/game/new \
  -H 'content-type: application/json' \
  -d '{"startingPlayer":"human"}'
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
