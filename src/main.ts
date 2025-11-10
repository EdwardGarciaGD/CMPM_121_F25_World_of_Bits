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
const tileDegrees = 2e-4;
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
  const bounds = leaflet.latLng([
    origin.lat + i * tileDegrees,
    origin.lng + j * tileDegrees,
  ]);
  let pointValue = Math.floor(luck([i, j, "initialValue"].toString()) * 2);

  const circleCache = leaflet.circle(bounds, { radius: 7 }).addTo(map);
  circleCache.bindPopup(() => {
    const cachePopup = document.createElement("div");
    cachePopup.innerHTML = ` Value ${pointValue}`;

    const dropButton = document.createElement("button");
    dropButton.className = "drop";
    dropButton.innerText = "Drop";
    cachePopup.appendChild(dropButton);

    const takeButton = document.createElement("button");
    takeButton.className = "take";
    takeButton.innerText = "Take";
    cachePopup.appendChild(takeButton);

    cachePopup
      .querySelector<HTMLButtonElement>(".take")!
      .addEventListener("click", () => {
        if (pointValue !== 0) {
          if (playerInventory === pointValue || playerInventory === 0) {
            playerInventory += pointValue;
            pointValue = 0;
            cachePopup.innerHTML =
              ` Value ${pointValue} <button id="drop">Drop</button>`;
            statusPanel.innerHTML = `You have ${playerInventory}`;
          } else {
            statusPanel.innerHTML =
              `You hand value is not the same value to combine them`;
          }
        }
      });
    cachePopup
      .querySelector<HTMLButtonElement>(".drop")!
      .addEventListener("click", () => {
        if (pointValue === 0 && playerInventory > 0) {
          pointValue = playerInventory;
          playerInventory = 0;
          cachePopup.innerHTML =
            ` Value ${pointValue} <button id="take">Take</button>`;
          statusPanel.innerHTML = `You have ${playerInventory}`;
        }
      });

    return cachePopup;
  });
}

/*function locateUser() {
  map.locate({ setView: true, maxZoom: 20, enableHighAccuracy: true });

      map.on('locationerror', (e) => {
      alert("📍 Location access denied or unavailable. Check browser permissions!");
      console.error(e.message);
    });
}*/
