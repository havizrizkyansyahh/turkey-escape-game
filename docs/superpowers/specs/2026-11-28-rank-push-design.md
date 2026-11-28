# Rank push: depth + showcase (v2 and v3)

## Intent

"Not On The Menu!" placed 39th of 6,307 in blind round 2, with a judge win rate of 0.7946. The goal is to finish in the top 10 of the final heat, on 2026-11-29 at 02:00Z.

The judge is an AI model, and it never plays the game. Each entry reaches it as a "judge view":

- one contact sheet of the screenshots: the cover fitted in 768x480, and the other three at about 256x160 beneath it;
- an outline of the source: each file's path and size, plus its first declarations.

The judge compares two entries at a time. It goes through the criteria in order, and the first criterion that differs decides:

1. completeness, as shown in the screenshots;
2. fun and depth, which includes a farmer who chases, searches and *corners* the turkey, and a reason to run again;
3. feel and polish;
4. look;
5. structure.

The entries ranked just above ours have art as good as ours. They win on depth signals that read at a glance: a controls strip, "SPOTTED" and combo callouts, stage labels, vision cones, decoys and medals. So this push adds real mechanics that the rubric names, and makes every one of them legible in the screenshots and the outline.

## Goals

- Add new mechanics that are real and playable, and visible in a screenshot:
  - the farmer corners Tom with a shortcut ambush;
  - a visible search cone while Tom hides;
  - per-run medals that are kept between runs.
- Give the HUD and screens explicit callouts:
  - a farmer status chip (CHASING, SEARCHING, CORNERED!, KNOCKED OUT);
  - a stage label like "STAGE 3/4";
  - close-call combos and "OUCH! -1 FEATHER";
  - a controls strip.
- Re-stage all four screenshots so that every rubric item reads at the size the judge sees.
- Order each source file so that its key functions are its first declarations, and give each new mechanic a file named after it.

## Non-goals

- Repainting the art style or changing the engine.
- Adding new stages.

## Anti-goals

These would make the push a failure even if the game still runs:

- A cluttered cover that reads worse than today's.
- A screenshot showing something the game cannot actually do. Screenshots must be real renders, and the top 3 are played by the make.fun team.
- An ambush that feels unfair. The good bot's escape rate must stay roughly where it is now, with no crashes.
- Breaking the gate. That means no network references, an identical dossier on two runs, and every screenshot at or under 256 KiB.

## Constraints

- Round 3 cuts off at 14:00Z. A v2 submitted before then gets a round-3 rank to learn from.
- The final is at 02:00Z, and the last submission counts. `makefun final` can pick the old entry back if v2 ranks worse.
- The game stays plain static files: canvas 2D, Web Audio, no assets, no build step.
- The simulation is deterministic, uses a seeded RNG and a 1/120 s fixed step, and can be tested from Node.

## Approaches

- **A. Screenshots and outline only.** Fast and low risk. Rivals are doing the same, so the ceiling is low.
- **B. Depth plus showcase (picked).** A, plus new mechanics that the rubric names and that the screenshots show. This needs more work and a tuning pass.
- **C. Art overhaul.** Look is only the fourth criterion. It is the slowest option and the hardest to verify in the time left.

## Design

### Ambush: "CORNERED!" (new file `game/src/ambush.js`)

- **When:** in the barn, the kitchen and the porch, every 14 to 22 seconds of chasing. The farmer must be chasing, Tom must not be hidden, and the lane must be clear: no stage gate, finish line or hiding spot within the next 700 px. The farmyard has no ambushes, so the danger ramps up from stage to stage.
- **Sequence:**
  1. *Shortcut* (0.9 s): the farmer says "Shortcut!" and drops out of the chase off-screen to the left.
  2. *Pop out:* he reappears about 640 px ahead of Tom, facing left, and blocks the lane.
  3. *Corner:* he stands his ground with a telegraphed grab. Either his arms are high, so Tom must duck and slide under, or his arms are low, so Tom must jump. A big "CORNERED!" chip and an arrow hint show which.
  4. *Swipe:* when Tom comes within reach, the farmer swipes for 0.3 s.
- **Outcomes:**
  - Tom is grabbed: he loses a feather, or he is caught if it was his last one.
  - Tom passes: "SLIPPED PAST! +100".
  - Tom lands on the farmer's hat: "HAT HOP! +150", and the farmer is knocked out.
- **After:** the farmer turns and resumes the chase from behind, after a stumble, so Tom keeps a fair gap.
- The bot learns the telegraph: it ducks for high arms and jumps for low arms.

### Search cone

- While the farmer searches a hiding spot, a translucent cone is drawn from his eyes:
  - strong amber when he is looking at the spot, which means it is not safe to sneak out;
  - faint when he looks away.
- In the barn and on the porch he carries a lantern, and the cone is its beam.
- This is a rendering change only. It uses the existing look-at and look-away timer.

### Callouts

- **HUD farmer chip** shows the farmer's state and distance: "! CHASING 14 m", "SEARCHING...", "CORNERED!", "KNOCKED OUT".
- **Route bar title** reads "STAGE n/4 · <stage name>".
- **Close-call combo:** close calls within 2.5 s of each other chain into x2 and x3, and the popup reads "CLOSE CALL x3 +75".
- **Hurt popup:** "OUCH! -1 FEATHER".
- **Controls strip** along the bottom of the play screen. It shows during play, can be hidden with H, and is drawn in the shots.

### Medals (new file `game/src/medals.js`)

There are six medals, earned per run and stored with the best score:

- No Feather Lost;
- Hat Hopper, for stomping the farmer during an ambush;
- Oven Dancer, for 5 oven close calls;
- Ghost, for sneaking out unseen;
- Pumpkin Smasher, for 8 smashes;
- Great Escape, for reaching the woods.

The end screen shows the medals won this run and marks new ones. The title screen shows "MEDALS n/6".

### Screenshots

1. **Cover:** the kitchen climax. It shows:
   - Tom fluttering over Old Bertha's blast;
   - the farmer lunging behind him with a carving knife, and a second knife in the air;
   - "CLOSE CALL x3";
   - the CHASING chip, the full HUD with STAGE 3/4, and the controls strip.
2. **Title:** big logo, START, and a farmyard-to-woods stage map. The attract scene shows the farmer with a lantern searching a haystack while Tom peeks out.
3. **Barn ambush:** a big "CORNERED!" chip, the farmer with his arms spread in front of Tom, and Tom mid-hop over his hat.
4. **End screen:** "ESCAPED!", the medal row with a "NEW!" mark, stats, and a large RUN AGAIN button.

### Outline

- In `run.js`, `farmer.js`, `audio.js`, `hazards.js`, `main.js` and `game.js`, move the key exported functions above the constant tables. Function declarations are hoisted, so behaviour does not change.
- New files are named for what they do: `ambush.js`, `medals.js`, and `scoring.js` for combos.
- The `index.html` aria-label describes the game in one line.

## v3 (after round 3, before the final)

- Corn decoy on Q or right-drag: toss corn, and the farmer turns to look.
- A wardrobe of unlockable disguises, earned with medals: Pilgrim hat, Groucho glasses, fake duck bill.
- A polish pass shaped by the round-3 result.

## Testing

- `node tools/simulate-runs.ts 60` with the good bot: no crashes, and an escape rate within about 10 points of today's 53/60.
- The lazy bot is still caught early.
- Play the game in Chrome: the ambush, the cone, the medals, the strip toggle, pause and restart.
- `main.ts` writes an identical dossier on two runs. `makefun check` passes before submitting.

## Builder's calls

- Exact timings, the ambush frequency per stage, and the medal thresholds.
- The callout wording and the layout of the controls strip.
