# DeathRoll Strategic Variants

Ideas for rule modifications that add strategic depth without changing RNG mechanics.

## Core Problem
In standard DeathRoll, players have **zero decision-making** during gameplay:
- You roll when it's your turn
- The RNG determines everything
- No meaningful choices exist

## Goal
Add rules that give players **meaningful choices** and **strategic influence** over outcomes.

---

## 🎯 VARIANT IDEAS

### 1. **Reverse Order on MAX Roll** ⭐⭐⭐⭐⭐
**Rule**: When you roll the maximum possible number (e.g., 42/42), turn order REVERSES.

**Strategic Impact**:
- **High numbers become risky**: Rolling high might send it back to you sooner
- **Position matters more**: Being before/after certain players becomes important
- **Mind games**: Do you want to roll high or low?

**Example** (4 players: A→B→C→D):
```
A starts with 50, rolls 30 → B's turn (max=30)
B rolls 30 (MAX!) → Order reverses to B→A→D→C
A rolls next with max=30
```

**Complexity**: LOW (easy to implement, easy to understand)
**Fun Factor**: HIGH (adds tension to high rolls)

---

### 2. **Choose Next Player** ⭐⭐⭐⭐⭐
**Rule**: After rolling, YOU choose who goes next (instead of automatic rotation).

**Strategic Impact**:
- **Target specific players**: Force someone you want to lose to take a dangerous roll
- **Protect allies**: Skip players you want to protect
- **Complex meta**: Players form temporary alliances
- **Massive strategic depth**: Every roll involves a decision

**Example**:
```
A rolls 42→15
A chooses: "Player C goes next" (skipping B)
C must roll 1-15
```

**Complexity**: LOW (easy to implement)
**Fun Factor**: VERY HIGH (creates social dynamics)
**Downside**: Could be slow if players overthink

---

### 3. **Split Roll Option** ⭐⭐⭐⭐
**Rule**: After seeing your roll, you can SPLIT it between the next TWO players.

**Strategic Impact**:
- **Risk distribution**: Spread danger across multiple players
- **Tactical choice**: Split or pass full number?
- **Math strategy**: How you split matters

**Example**:
```
You roll 20
Option A: Next player gets 20 (normal)
Option B: Split → P1 gets 12, P2 gets 8
```

**Complexity**: MEDIUM (need UI for splitting)
**Fun Factor**: HIGH (interesting math decisions)

---

### 4. **Mulligan Tokens** ⭐⭐⭐⭐
**Rule**: Each player gets ONE reroll per game. After rolling, you can use your token to reroll.

**Strategic Impact**:
- **Save yourself**: Reroll when you get a dangerous low number
- **Resource management**: When to use your precious reroll?
- **Bluffing**: Threaten to reroll to make others worried

**Example**:
```
You roll 2 (dangerous!)
Use mulligan → Reroll, get 15 (safer)
Your mulligan is now gone for the rest of the game
```

**Complexity**: LOW (easy to implement)
**Fun Factor**: HIGH (creates tense moments)

---

### 5. **Range Manipulation** ⭐⭐⭐⭐
**Rule**: Before rolling, you can MODIFY the range by ±20% (but NOT below 2).

**Strategic Impact**:
- **Control danger level**: Make it safer or riskier
- **Strategic trade-offs**: Increase range = higher chance next player loses

**Example**:
```
Current max = 50
You can choose:
- Roll 1-40 (80% of 50 = safer for you, harder for next player)
- Roll 1-50 (normal)
- Roll 1-60 (120% of 50 = riskier for you, easier for next player)
```

**Complexity**: MEDIUM (need UI for range selection)
**Fun Factor**: HIGH (constant decision-making)

---

### 6. **Challenge System** ⭐⭐⭐⭐
**Rule**: Before someone rolls, ANY player can "challenge" them. If challenged, the roller must roll TWICE and take the LOWER result.

**Strategic Impact**:
- **Social dynamics**: Target players you think are getting too lucky
- **Risk/reward**: Challenging costs something (maybe YOUR next roll is also challenged)
- **Meta game**: When to challenge?

**Example**:
```
Player A's turn (max = 30)
Player B challenges: "I challenge you!"
Player A must roll twice: Gets 25 and 12 → Takes 12 (lower)
Player B's next turn is automatically challenged too
```

**Complexity**: MEDIUM (need challenge UI + cost system)
**Fun Factor**: VERY HIGH (creates drama)

---

### 7. **Ability Cards** ⭐⭐⭐⭐⭐
**Rule**: Each player starts with 3 random ability cards. Use one per turn.

**Example Abilities**:
- **Shield**: Your next roll can't be below 10
- **Curse**: Next player's roll can't be above 5
- **Swap**: Swap positions with another player in turn order
- **Double**: Roll twice, take the better result
- **Redistribute**: Take the current max and redistribute it however you want across all players
- **Freeze**: Skip your turn, next player gets same max as you would have
- **Mirror**: Copy the last ability used by another player

**Strategic Impact**:
- **Huge decision space**: Which card to use when?
- **Counterplay**: Use abilities to counter others
- **Deck building**: Different card sets for different strategies

**Complexity**: HIGH (need card system, UI, balancing)
**Fun Factor**: EXTREMELY HIGH (like a strategy card game)

---

### 8. **Auction System** ⭐⭐⭐⭐
**Rule**: Instead of automatic turns, players BID (using points/tokens) for who goes next.

**Strategic Impact**:
- **Economic strategy**: Manage your bidding currency
- **Risk assessment**: How much is it worth to avoid a dangerous roll?
- **Player interaction**: Outbid opponents

**Example**:
```
Current max = 5 (very dangerous!)
Players bid:
- Alice: 10 tokens ("I'll pay 10 to NOT go")
- Bob: 5 tokens
- Carol: 0 tokens
→ Carol goes (lowest bid = must roll)
```

**Complexity**: HIGH (need token economy, bidding UI)
**Fun Factor**: HIGH (very strategic, but slow)

---

### 9. **Combo Chains** ⭐⭐⭐
**Rule**: If you roll the same number as the previous player, you get a "combo" and can choose a bonus.

**Bonuses**:
- Skip your next turn
- Add +10 to the next player's range
- Force a specific player to go next
- Protect yourself from rolling 1 this round

**Strategic Impact**:
- **Pattern recognition**: Try to predict rolls
- **Luck-based rewards**: Encourages engagement

**Complexity**: MEDIUM (need combo detection + bonus system)
**Fun Factor**: MEDIUM (fun when it happens, but rare)

---

### 10. **Team Swap Rule** ⭐⭐⭐⭐
**Rule**: (For team mode) When your teammate rolls a 1, YOU can take the loss instead.

**Strategic Impact**:
- **Sacrifice play**: Protect your team
- **Strategic martyrdom**: Take one for the team when you're ahead
- **Team coordination**: Discuss who should take losses

**Complexity**: LOW (easy to implement)
**Fun Factor**: HIGH (creates dramatic moments)

---

## 🏆 RECOMMENDED IMPLEMENTATIONS

### 🥇 **EASY WINS** (Implement These First)
1. **Reverse Order on MAX Roll** - Easiest, adds immediate strategy
2. **Mulligan Tokens** - Simple, high impact
3. **Choose Next Player** - Revolutionary for gameplay, easy to code

### 🥈 **MEDIUM EFFORT, HIGH REWARD**
4. **Range Manipulation** - Gives players constant choices
5. **Challenge System** - Creates social dynamics
6. **Team Swap Rule** - Great for team mode

### 🥉 **ADVANCED** (For V2)
7. **Ability Cards** - Most complex, most fun, basically a new game
8. **Auction System** - Very strategic, but slower gameplay

---

## 🎮 SUGGESTED IMPLEMENTATION ORDER

### Phase 1: "Quick Strategic Boost"
- Add **Mulligan Tokens** (1 per player per game)
- Add **Reverse Order on MAX Roll**
- Results: Players now have SOME decision-making

### Phase 2: "Deep Strategy"
- Add **Choose Next Player** mode (optional game mode toggle)
- Results: Completely changes the game dynamics

### Phase 3: "Advanced Variants"
- Add **Ability Cards** as a separate game mode
- Add **Range Manipulation** as an option
- Results: Multiple distinct game modes

---

## 💡 IMPLEMENTATION DETAILS

### Game Settings UI Needed:
```typescript
interface GameSettings {
  // Core settings
  startingRange: number;

  // Strategic variant toggles
  reverseOnMaxRoll: boolean;
  mulliganEnabled: boolean;
  mulligansPerPlayer: number; // default: 1

  // Advanced modes (mutually exclusive?)
  turnMode: 'rotation' | 'choose_next_player' | 'auction';
  rangeManipulation: boolean;
  rangeManipulationPercent: number; // default: 20

  // Power-up mode
  abilityCardsEnabled: boolean;
  cardsPerPlayer: number; // default: 3

  // Challenge mode
  challengeSystemEnabled: boolean;
}
```

### Message Types to Add:
```typescript
// Player actions
| { type: "USE_MULLIGAN" }
| { type: "CHOOSE_NEXT_PLAYER"; targetPlayerId: string }
| { type: "MANIPULATE_RANGE"; newRange: number }
| { type: "USE_ABILITY_CARD"; cardId: string; target?: string }
| { type: "CHALLENGE_PLAYER"; targetPlayerId: string }
| { type: "TAKE_LOSS_FOR_TEAMMATE" }

// State updates
interface GameState {
  // Existing fields...

  // New fields
  turnOrderReversed: boolean;
  mulligansRemaining: Record<string, number>; // playerId -> count
  abilityCards: Record<string, AbilityCard[]>; // playerId -> cards
  lastRollWasMax: boolean;
}
```

---

## 📊 STRATEGIC DEPTH ANALYSIS

### Current DeathRoll:
- Decision points per game: **1** (choosing starting number)
- Skill ceiling: **Very Low**
- Replayability: **Medium** (fun, but repetitive)

### With Mulligan + Reverse on Max:
- Decision points: **2-3 per player** (when to mulligan, risk max rolls)
- Skill ceiling: **Low-Medium**
- Replayability: **High** (more varied outcomes)

### With Choose Next Player:
- Decision points: **10-20 per game** (choose target every turn)
- Skill ceiling: **High** (social deduction, alliances)
- Replayability: **Very High** (infinite strategies)

### With Ability Cards:
- Decision points: **30-50 per game** (which card, when to use, who to target)
- Skill ceiling: **Very High** (like a card game)
- Replayability: **Extremely High** (deck variety, combos)

---

## 🎯 FINAL RECOMMENDATION

**Start with these 3 simple additions:**

1. ✅ **Mulligan Tokens** (1 reroll per game per player)
   - Easiest to implement
   - Immediately adds decision-making
   - Doesn't slow down gameplay

2. ✅ **Reverse Order on MAX Roll**
   - Trivial to implement
   - Makes high rolls interesting
   - Adds strategic layer to range selection

3. ✅ **Choose Next Player Mode** (optional game mode)
   - Medium effort to implement
   - Completely transforms gameplay
   - Can be toggled on/off for different experiences

**These 3 changes would make DeathRoll feel like an actual strategy game instead of pure RNG.**
