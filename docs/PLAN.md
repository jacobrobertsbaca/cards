I want to create a realtime site that allows playing multiplayer card games that I enjoy, starting with the game "Oh Hell" but potentially expanding to other games. The site should be built on Next.js and Supabase, and the UI should focus on extreme minimalism (very low UI bloat, every on-screen element is intuitive), using Shadcn. Think Anthropic/Supabase kind of styling. Cute but minimal animations throughout.

# General

The app is completely anonymous for now. Games can be joined by using a small alphanumeric URL, e.g. `{domain}/ghj123j2` (kind of like YouTube URLs). Can close/open the tab to quit/join.

# Interface

The sidebar tracks past games that have been played, stored locally. Bottom of sidebar has your display name, which is randomly generated and fun off the bat but can be changed at any time. Sidebar is collapsed by default, hovering over an icon shows it and keeps it open (on desktop, should be mobile friendly too), similar to the Claude interface.

## Creating a Game

Dropdown to select which game, after which more game-specific options appear. Only current option is "Oh Hell". Options for Oh-Hell are:

1. **Players:** At least two. Up to 5.
2. **Pattern:** What number of cards to deal. Defaults to "1..10..1" but can be customized to be any number of rounds via a clean interface.
3. **Lead Trump:** `Always`, `After Broken`. Whether a player can lead trump always or only after it has been broken.
4. **Hook:** Whether the dealer can make any bid or if they are restricted to making a bid that does make the total of bids equal to the number of tricks played.
5. **Scoring:** How points should be scored. Symbolic equation beautifully rendered with a hidden-away explanation. Allow conditional math, rendering it as a math cases statement with beautiful UI. Defaults to `{b = t : 10 * b + t, t}` where `b` is the bid and `t` is the tricks taken.

## Gameplay

Simulate a real oh-hell game. The basic UI should have our cards at the bottom, with others face-down cards around the edge of the screen (see [this screenshot](./screenshot.png) for a high-level example). Note that players can join and leave, and we always wait for the next player. There should be a button to join the game explicitly when visiting the page. Players are assigned to a "seat" as soon as they join for the first time, and should be uniquely IDed. Game state is always saved to the database to allow re-joining. You can also "spectate" a game, allowing you to view all player state. Game starts when every seat has been filled.

## Guidelines

Create a very simple mockup of the behaviour I want. Keep code and UI very simple but elegant. We can refine as we go. Ask questions where behaviour is unclear.
