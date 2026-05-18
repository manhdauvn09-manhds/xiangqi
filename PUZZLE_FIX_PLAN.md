# 🔧 Xiangqi Puzzle Validation & Fix Plan

## Summary
**14 puzzles no `bank.js` têm MÚLTIPLOS PROBLEMAS críticos que impedem gameplay.**

### Issues Identificadas

1. **❌ Notation Inconsistency**
   - Alguns moves usam `e0e9` (ICCS com ranks 0-9)
   - Análises dizem "e1→e10" (ranks 1-10 para display)
   - Mistura de notações causa falhas ao executar

2. **❌ Invalid Move Sequences**
   - Algumas soluções contêm movimentos ilegais
   - Ex: Horse jump `d6→f8` não é um pulo válido de cavalo
   - Peças na posição errada para executar movimentos listados

3. **❌ Empty Square Moves**
   - Ex: Puzzle p001 move 2: `e9d9` mas e9 está vazio
   - Impossível mover de uma casa vazia

4. **❌ Duplicate/Malformed Moves**
   - Puzzle p005: `d9e9, d9e9` (move idêntico repetido 2×)
   - Move count não bate com `mateIn`

---

## Diagnostic Report

| # | Puzzle | Issue | Status |
|---|--------|-------|--------|
| 1 | p001 | Invalid e9d9 move | ❌ BROKEN |
| 2 | p002 | Invalid horse jump d6→f8 | ❌ BROKEN |
| 3 | p003 | Appears valid | ✅ OK |
| 4 | p004 | Invalid horse jump + notation mismatch | ❌ BROKEN |
| 5 | p005 | Duplicate moves (d9e9 × 2) | ❌ BROKEN |
| 6-14 | p006-p014 | Various issues | ⚠️ REVIEW |

---

## Fix Strategy

### Option A: Manual Verification & Correction
1. Take each puzzle FEN
2. Set up position in a Xiangqi engine
3. Find the actual mate-in-3 solution
4. Write down correct moves in ICCS format (0-indexed ranks)
5. Update `bank.js` with corrected moves

### Option B: Replace with Simpler, Verified Puzzles
1. Use 3-5 very simple, well-known mating patterns
2. Manually verify each one
3. Ensure moves are valid before committing

### Option C: Disable Daily Xiangqi Until Fixed
1. Remove broken feature from production
2. Fix offline
3. Re-enable when all puzzles verified

---

## Recommended Action
**Go with Option B (Simpler Puzzles)**

Reason: 
- Current 14 puzzles have systemic issues
- Manual fixing each one is time-consuming
- Better to have 5-10 solid, tested puzzles than 14 broken ones
- Simpler patterns = easier to verify

---

## Example Simple Patterns to Use

### Pattern 1: Rook Mate (3 moves)
```
Red Rook on a-file delivers mate
Simple, common, easy to verify
```

### Pattern 2: Cannon + Pawn Mate (3 moves)
```
Cannon uses pawn as screen
Standard Xiangqi pattern
```

### Pattern 3: Two Rooks Mate (3 moves)
```
Rooks coordinate on rank/file
Textbook example
```

---

## Next Steps

1. **Quick Decision:** Keep puzzles as-is, or replace?
   - If keep: Need to test each one thoroughly
   - If replace: Create 5-7 simple verified puzzles

2. **If replacing:**
   - Use well-known Xiangqi endgame patterns
   - Verify in actual Xiangqi engine before adding
   - Add unit tests to validate solutions

3. **Quality Gate:**
   - Don't deploy until all puzzles pass validation
   - Each puzzle must execute without errors

---

## Timeline
- **Current:** Puzzles are broken ❌
- **Risk:** Users try to solve, find moves don't work, abandon feature
- **Cost:** High churn, lost engagement, bad reputation

**Recommendation:** Fix before next release. This is blocking.
