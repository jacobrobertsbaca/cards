I would now like you to implement Bridge on top of the current site, which supports only Oh Hell. Implement a full 4-person game of Rubber bridge with bots. Implement the game to have a similar UI and flow as the original Oh Hell game (they are, after all, part of the same site).

# Gameplay

## Bidding

Use a similar interface as the bid selector in Oh Hell, but extend it to also include suits, passing, and doubling/redoubling (where appropriate). The bid selector should be a combination of a bid level selector (which matches the current interface) and a trump suit selector (Clubs, Diamonds, Hearts, Spades, NT). Do not use a large/bulky bidding grid.

## Scoring

We will use standard rubber bridge scoring. See this [Wikipedia page](https://en.wikipedia.org/wiki/Bridge_scoring) for more details. The scoresheet should open up a rubber bridge scoresheet (with above the line and below the line scoring). Reference my [bridge scoresheet app](https://github.com/jacobrobertsbaca/bridge) for more info on how the scoring logic and presentation should look. A screenshot of that app's scoresheet is shown in [`bridge.png`](./bridge.png). Your scoresheet should also include the point totals on each side as well as past bids, and how many points they netted/lost each team, similar to what is shown in the screenshot.

# Development

You will develop locally (without a connection to Supabase). Draft a migration for Supabase when your changes are ready to be deployed, but understand that development will be local for now.

## Composition

Before developing, come up with a plan of action on how the game will be implemented. You should not pollute the existing code-base by trickling in logic for Bridge alongside the existing Oh Hell logic. Instead, take a moment to identify what parts of the logic are separable from Oh-Hell. Right now, there is a `src/lib/game` folder. One architecture would be to rename that to `src/lib/oh-hell` and have a `src/lib/bridge` alongside, with common logic existing in the other folders, and similarly having a `src/components/oh-hell` etc. Either way, do not pollute the codebase, but rather be intentional about how you structure the files so that we have a framework for extending the app to support other games in the future without the code become bloated and messy.

## Testing

Try to re-use as much of the game UI/flow as possible. Throughout development, you must test that BOTH games (the original Oh Hell and the new bridge game) satisfy the following constraints:

1. Games can successfully played for both game types, from start to finish.
2. Games can be played with bots enabled, with bots bidding and playing any role competitively.
3. The game-agnostic parts of the UI still work: emotes can be sent, view game settings, set game title, etc.

Make sure that both games pass before you are done. Test the games throughout development. Rigorously use screenshots to test and inspect visual behaviour, and use the MCP protocol to interact with the live game. I would recommend playing Oh Hell first to understand the game flow before continuing.
