import leaflet from "leaflet";
import "leaflet/dist/leaflet.css"; // Supporting style for Leaflet
import "./style.css";
import "./_leafletWorkaround.ts"; // Fixes for missing Leaflet images
import luck from "./_luck.ts";

// Gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 17;
const TILE_DEGREES = .9e-4;
const NEIGHBORHOOD_SIZE = 139;
const CACHE_SPAWN_PROBABILITY = 0.1;
const startingLocation = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// UI elements
document.title = "Beachcomb the World";

const mapStyle = document.createElement("div");
mapStyle.id = "map";
document.body.append(mapStyle);

const statusPanel = document.createElement("div");
statusPanel.id = "statusPanel";
document.body.append(statusPanel);

// Map creation
const map = leaflet.map(mapStyle, {
  center: startingLocation,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL - 3,
  maxZoom: GAMEPLAY_ZOOM_LEVEL + 1,
  zoomControl: true,
  scrollWheelZoom: true,
});

// Background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Player marker
const playerMarker = leaflet.marker(startingLocation);
playerMarker.bindTooltip("You are here");
playerMarker.addTo(map);

// Player's inventory
let playerInventory = 0;
statusPanel.innerHTML = "You are holding nothing";

// Player's neighborhood cache spawn
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}

// Adds caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  const origin = startingLocation;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    let pointValue = Math.floor(luck([i, j, "initialValue"].toString()) * 5);

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i},${j}". It has value <span id="value">${pointValue}</span>.</div>
                <button id="poke">poke</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#poke")!
      .addEventListener("click", () => {
        pointValue--;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          pointValue.toString();
        playerInventory++;
        statusPanel.innerHTML = `${playerInventory} points accumulated`;
      });

    return popupDiv;
  });
}
