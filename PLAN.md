# D3: Beachcomb The World

# Game Design Vision

The player can move around the world using their geo location or in a simulated walk for to pick up a token inside a cell.
The player can pick up a token from a cell and drop it to another cell with the same token value or to an empty cell.
The player can only hold one token and can only grab a token near their position.
Whenever a player is not in the radius of a cell they can interact, then the cell would be gray out and non-interactable.
An animation would occur when a player is hovering over a cell near them.
A text will be on screen for the user to know which token they are holding.

# Technologies

- TypeScript for most game code, little to no explicit HTML, and all CSS
  collected in common `style.css` file
- Deno and Vite for building
- GitHub Actions + GitHub Pages for deployment automation

# Assignments

## D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Can you assemble a map-based user interface using the
Leaflet mapping framework?
Key gameplay challenge: Can players collect and craft tokens from nearby
locations to finally make one of sufficiently high value?

### D3.a Steps

- [x] copy main.ts to reference.ts for future reference
- [x] delete everything in main.ts
- [x] put a basic leaflet map on the screen
- [x] draw the player's location on the map
- [x] draw a circle representing one cell on the map
- [x] use loops to draw a whole grid of cells on the map
- [x] Have player grab token and combine with same value tokens
- [x] Have player be able to drop token value currently in hand to any empty cell

## D3.b: Globe Spanning Gameplay (User movement and cell expansion throughout map)

​Key technical challenge: Can you set up your implementation to support gameplay
anywhere in the real world, not just locations near our classroom?
​Key gameplay challenge: Can players craft an even higher value token by moving to
other locations to get access to additional crafting materials?

### D3.b Steps

- [ ] Create local user movement with arrow key buttons
- [ ] Have cells around user be interactable with different color display
- [ ] Have cells far from user to be non-interactable with different color display
- [ ] Have cells to be memoryless and farmable by user
- [ ] Have achievement ending when user reaches certain number on inventory
- [ ] Have refactoring between each step
