import leaflet from "leaflet";
import "leaflet/dist/leaflet.css"; // Supporting style for Leaflet
import "./style.css";
import "./_leafletWorkaround.ts"; // Fixes for missing Leaflet images
import luck from "./_luck.ts";
import playerIconURL from "./Player Icon.jpg";

// Gameplay parameters
const mapZoomLevel = 17;
const minMapZoomLevel = 14;
const maxMapZoomLevel = 18;
const tileDegrees = .9e-4;
const neighborhoodSize = 139;
const cacheSpawnProbability = 0.3;
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

/*const currentLocationButton = document.createElement("button");
currentLocationButton.innerText = "Recenter";
document.body.append(currentLocationButton);
currentLocationButton.onclick = () => { locateUser() };*/

// Map creation
const map = leaflet.map(mapStyle, {
  center: startingLocation,
  zoom: mapZoomLevel,
  minZoom: minMapZoomLevel,
  maxZoom: maxMapZoomLevel,
  zoomControl: true,
  touchZoom: true,
  scrollWheelZoom: true,
});
map.setView(startingLocation);

// Background tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Player marker
const playerIcon = leaflet.icon({
  iconUrl: playerIconURL,
  iconSize: [40, 40],
});
const playerMarker = leaflet.marker(startingLocation, { icon: playerIcon })
  .addTo(map);
playerMarker.bindTooltip("You are here");

// Player's inventory
let playerInventory = 0;
statusPanel.innerHTML = "You are holding nothing";

// Player's neighborhood cache spawn loop
for (let i = -neighborhoodSize; i < neighborhoodSize; i++) {
  for (let j = -neighborhoodSize; j < neighborhoodSize; j++) {
    if (luck([i, j].toString()) < cacheSpawnProbability) {
      spawnCache(i, j);
    }
  }
}

// Adds caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  const origin = startingLocation;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * tileDegrees, origin.lng + j * tileDegrees],
    [origin.lat + (i + 1) * tileDegrees, origin.lng + (j + 1) * tileDegrees],
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

/*function locateUser() {
  map.locate({ setView: true, maxZoom: 20, enableHighAccuracy: true });

      map.on('locationerror', (e) => {
      alert("📍 Location access denied or unavailable. Check browser permissions!");
      console.error(e.message);
    });
}*/
