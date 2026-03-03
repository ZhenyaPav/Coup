export interface ActionInfo {
  name: string;
  effect: string;
  cost: number;
  blockable: string | false;
  claim?: string;
}

export interface CharacterInfo {
  name: string;
  ability: string;
  blocks: string;
}

export const humanRules = {
  objective: "Be the last player with at least one hidden influence card.",

  setup: {
    cards: "Each player starts with 2 hidden influence cards",
    coins: "Starting player gets 1 coin, other player gets 2 coins"
  },

  influence: {
    title: "Losing Influence",
    points: [
      "When you lose influence, reveal one hidden card",
      "If both cards are revealed, you are eliminated",
      "Revealed cards remain visible and cannot be used"
    ]
  },

  turnRules: {
    title: "Your Turn",
    points: [
      "On your turn, take exactly ONE action",
      "If you have 10+ coins, you MUST Coup",
      "Coup costs 7 coins and cannot be blocked or challenged"
    ]
  },

  actions: {
    title: "Actions",
    basic: [
      { name: "Income", effect: "Gain 1 coin", cost: 0, blockable: false },
      { name: "Foreign Aid", effect: "Gain 2 coins", cost: 0, blockable: "Duke" },
      { name: "Coup", effect: "Target loses 1 influence", cost: 7, blockable: false }
    ] as ActionInfo[],
    character: [
      { name: "Tax", effect: "Gain 3 coins", cost: 0, blockable: false, claim: "Duke" },
      { name: "Assassinate", effect: "Pay 3, target loses 1 influence", cost: 3, blockable: "Contessa", claim: "Assassin" },
      { name: "Steal", effect: "Take up to 2 coins from target", cost: 0, blockable: "Captain or Ambassador", claim: "Captain" },
      { name: "Exchange", effect: "Draw 2 cards, keep 2", cost: 0, blockable: false, claim: "Ambassador" }
    ] as ActionInfo[]
  },

  blocking: {
    title: "Blocking",
    description: "Some actions can be blocked by claiming a character:",
    blocks: [
      { action: "Foreign Aid", blocker: "Duke" },
      { action: "Assassination", blocker: "Contessa (target only)" },
      { action: "Stealing", blocker: "Captain or Ambassador (target only)" }
    ]
  },

  challenging: {
    title: "Challenges",
    description: "Any character claim (for action or block) can be challenged:",
    success: "If challenged player CANNOT prove claim → they lose 1 influence",
    failure: "If challenged player CAN prove claim → challenger loses 1 influence, card is replaced"
  }
};

export const characters: CharacterInfo[] = [
  { name: "Duke", ability: "Tax: Take 3 coins from treasury", blocks: "Foreign Aid" },
  { name: "Assassin", ability: "Assassinate: Pay 3 coins to make target lose influence", blocks: "—" },
  { name: "Captain", ability: "Steal: Take up to 2 coins from target", blocks: "Stealing" },
  { name: "Ambassador", ability: "Exchange: Draw 2 cards from deck, keep 2", blocks: "Stealing" },
  { name: "Contessa", ability: "—", blocks: "Assassination" }
];

export const quickTips = [
  "Bluffing is key - you don't need the card to claim it!",
  "Challenging is risky but can eliminate opponents quickly",
  "At 10 coins, you must Coup - plan ahead!",
  "Watch your opponent's revealed cards to deduce their hand"
];

export const phaseNames: Record<string, string> = {
  'await_action': 'Choose Your Action',
  'await_action_response': 'Respond to Action',
  'await_block_response': 'Respond to Block',
  'resolve': 'Resolving Effects',
  'game_over': 'Game Over'
};

export const waitingMessages: Record<string, string> = {
  'WAITING_FOR_TURN': 'Waiting for AI to choose an action...',
  'WAITING_FOR_ACTION_RESPONSE': 'Waiting for AI to respond to your action...',
  'WAITING_FOR_BLOCK_RESPONSE': 'Waiting for AI to respond to block...',
  'CHOOSING_REVEAL': 'Choose one of your hidden cards to reveal.',
  'CHOOSING_EXCHANGE': 'Choose which cards to keep after exchange.',
  'WAITING_FOR_REVEAL': 'Waiting for AI to reveal a card...',
  'WAITING_FOR_EXCHANGE': 'Waiting for AI to choose exchange cards...'
};

export const actionDescriptions: Record<string, string> = {
  'declare_action:income': 'Take 1 coin - cannot be blocked or challenged',
  'declare_action:foreign_aid': 'Take 2 coins - can be blocked by Duke',
  'declare_action:coup': 'Pay 7 coins, target loses 1 influence (unstoppable)',
  'declare_action:tax': 'Claim Duke to take 3 coins from treasury',
  'declare_action:assassinate': 'Pay 3 coins, target loses influence unless blocked by Contessa',
  'declare_action:steal': 'Claim Captain to steal up to 2 coins from target',
  'declare_action:exchange': 'Claim Ambassador to draw 2 cards and keep 2',
  'challenge_action': 'Challenge that opponent does not have the claimed card',
  'challenge_block': 'Challenge that blocker does not have the claimed card',
  'allow': 'Allow the action to proceed',
  'block:duke': 'Block Foreign Aid by claiming Duke',
  'block:contessa': 'Block Assassination by claiming Contessa',
  'block:captain': 'Block Stealing by claiming Captain',
  'block:ambassador': 'Block Stealing by claiming Ambassador'
};

export const actionButtonLabels: Record<string, string> = {
  'income': 'Income (+1)',
  'foreign_aid': 'Foreign Aid (+2)',
  'coup': 'Coup (7 coins)',
  'tax': 'Tax as Duke (+3)',
  'assassinate': 'Assassinate (3 coins)',
  'steal': 'Steal',
  'exchange': 'Exchange as Ambassador'
};

export const blockLabels: Record<string, string> = {
  'duke': 'Block as Duke',
  'contessa': 'Block as Contessa',
  'captain': 'Block as Captain',
  'ambassador': 'Block as Ambassador'
};
