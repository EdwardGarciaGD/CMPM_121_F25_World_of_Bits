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

### Steps

- [x] copy main.ts to reference.ts for future reference
- [x] delete everything in main.ts
- [ ] put a basic leaflet map on the screen
- [ ] draw the player's location on the map
- [ ] draw a rectangle representing one cell on the map
- [ ] use loops to draw a whole grid of cells on the map
