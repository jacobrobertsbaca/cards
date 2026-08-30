I would now like you to implement Bridge on top of the current site, which supports only Oh Hell. Implement a full 4-person game of Rubber bridge with bots. Implement the game to have a similar UI and flow as the original Oh Hell game (they are, after all, part of the same site).

# Bidding

Use a similar interface as the bid selector in Oh Hell, but extend it to also include suits, passing, and doubling/redoubling (where appropriate).

# Scoring

We will use standard rubber bridge scoring. See this [Wikipedia page](https://en.wikipedia.org/wiki/Bridge_scoring) for more details. The scoresheet should open up a rubber bridge scoresheet (with above the line and below the line scoring). Reference my [bridge scoresheet app](https://github.com/jacobrobertsbaca/bridge) for more info on how the scoring logic and presentation should look. A screenshot of that app's scoresheet is shown in [`bridge.png`](./bridge.png). Your scoresheet should also include the point totals on each side as well as past bids.

# Testing

Try to re-use as much of the game UI/flow as possible. Separate the logic out if it is inconvenient to do so as the code is currently written.

Throughout development, you must test that BOTH games (the original Oh Hell and the new bridge game) satisfy the following constraints:

1. Games can successfully played for both game types, from start to finish.
2. Games can be played with bots enabled, with bots bidding and playing any role.
3. Emotes can be sent.

Make sure that both games pass before you are done. Test the games throughout development. Vigorously use screenshots to test and inspect visual behaviour, and use the MCP protocol to interact with the live game.
