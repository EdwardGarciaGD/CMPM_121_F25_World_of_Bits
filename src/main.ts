import leaflet from "leaflet";
import "leaflet/dist/leaflet.css"; // Supporting style for Leaflet
import "./_leafletWorkaround.ts"; // Fixes for missing Leaflet images
import luck from "./_luck.ts";
import "./style.css";
import playerIconURL from "./Player Icon.jpg";

// Gameplay parameters
const emptyInventoryString = "You are holding nothing";
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
statusPanel.innerHTML = emptyInventoryString;

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
  const bounds = leaflet.latLng([
    startingLocation.lat + i * tileDegrees,
    startingLocation.lng + j * tileDegrees,
  ]);

  let cellTokenValue = Math.floor(luck([i, j, "initialValue"].toString()) * 2);

  const cachePopup = document.createElement("div");

  const popupText = document.createElement("p");
  popupText.textContent = updatePopupText(cellTokenValue);
  cachePopup.appendChild(popupText);

  const takeButton = createDocuElement("button", "take", "Take");
  cachePopup.appendChild(takeButton);

  const dropButton = createDocuElement("button", "drop", "Drop");
  cachePopup.appendChild(dropButton);

  const circleCache = leaflet.circle(bounds, { radius: 7 }).addTo(map);
  circleCache.bindPopup(() => {
    // Updates player Inventory and token value inside cell
    takeButton.addEventListener("click", () => {
      if (cellTokenValue > 0) {
        if (playerInventory === cellTokenValue || playerInventory === 0) {
          playerInventory += cellTokenValue;
          cellTokenValue = 0;
          statusPanel.innerHTML = updatePanelText();
        } else {
          statusPanel.innerHTML = "Cannot combine unequal proportions";
        }
        popupText.textContent = updatePopupText(cellTokenValue);
      }
    });

    dropButton.addEventListener("click", () => {
      if (cellTokenValue === 0) {
        cellTokenValue = playerInventory;
        playerInventory = 0;
        statusPanel.innerHTML = updatePanelText();
        popupText.textContent = updatePopupText(cellTokenValue);
      }
    });

    return cachePopup;
  });
}

function createDocuElement(
  elementType: string,
  className: string,
  elementText: string,
) {
  const button = document.createElement(elementType);
  button.className = className;
  button.innerText = elementText;
  return button;
}

function updatePopupText(value: number) {
  if (value <= 0) return "Empty";
  else if (value === 1) return `${value} twig`;
  else {
    return `${value} twigs`;
  }
}

function updatePanelText() {
  if (playerInventory === 1) return `You have ${playerInventory} twig`;
  if (playerInventory > 0) return `You have ${playerInventory} twigs`;
  else {
    return emptyInventoryString;
  }
}

/*function locateUser() {
  map.locate({ setView: true, maxZoom: 20, enableHighAccuracy: true });

      map.on('locationerror', (e) => {
      alert("📍 Location access denied or unavailable. Check browser permissions!");
      console.error(e.message);
    });
}*/
