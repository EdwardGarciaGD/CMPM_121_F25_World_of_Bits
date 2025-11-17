import * as L from "leaflet";
import "leaflet/dist/leaflet.css"; // Supporting style for Leaflet
import "./_leafletWorkaround.ts"; // Fixes for missing Leaflet images
import luck from "./_luck.ts";
import playerIconURL from "./Player Icon.jpg"; // User marker icon
import "./style.css";

type coordinates = {
  i: number;
  j: number;
};

// Flyweight key, tokenValue an is intristic state
interface CacheCell {
  tokenValue: number;
  marker: L.Circle;
}

// Gameplay parameters
const emptyInventoryString = "You are holding nothing";
const mapZoomLevel = 17;
const minMapZoomLevel = 14;
const maxMapZoomLevel = 18;
const tileDegrees = 13e-4;
const cacheSpawnProbability = 0.6;
const totalCaches = 80000;
const interactionRadius = 220;
const winStateValue = 4;
const userCoords: coordinates = {
  i: 36.997936938057016,
  j: -122.05703507501151,
};
const startingLocation = L.latLng(
  userCoords.i,
  userCoords.j,
);

// Stored caches throughout map
// Memento pattern for state preservation
const cacheStorage = new Map<string, CacheCell>();

// UI elements
document.title = "Beachcomb the World";

const mapStyle = document.createElement("div");
mapStyle.id = "map";
document.body.append(mapStyle);

const statusPanel = document.createElement("div");
statusPanel.id = "statusPanel";
document.body.append(statusPanel);

// Map creation
const map = L.map(mapStyle, {
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
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// User marker
const userIcon = L.icon({
  iconUrl: playerIconURL,
  iconSize: [40, 40],
});
const userMarker = L.marker(startingLocation, { icon: userIcon })
  .addTo(map);
userMarker.bindTooltip("This is you");

// User's inventory/hand
let userHand = 0;
statusPanel.innerHTML = emptyInventoryString;

// User local control movement
const leftMovement = createCustomControl("◀", "W");
const upMovement = createCustomControl("▲", "N");
const downMovement = createCustomControl("▼", "S");
const rightMovement = createCustomControl("▶", "E");

let userControl = new leftMovement({ position: "bottomleft" });
userControl.addTo(map);
userControl = new upMovement({ position: "bottomleft" });
userControl.addTo(map);
userControl = new downMovement({ position: "bottomleft" });
userControl.addTo(map);
userControl = new rightMovement({ position: "bottomleft" });
userControl.addTo(map);

// Initial caches creation
for (let i = 0; i < totalCaches; i++) {
  const lat = Math.random() * 180 - 90;
  const lon = Math.random() * 360 - 180;
  if (luck([lat, lon].toString()) < cacheSpawnProbability) {
    createInitCaches(lat, lon);
  }
}

map.on("moveend", () => {
  const userBounds = map.getBounds();
  displayVisibleCells(userBounds);
});

// Creates popup for initial and interactable caches
function attachPopup(circle: L.Circle, cell: CacheCell) {
  const cachePopup = document.createElement("div");

  const popupText = document.createElement("p");
  popupText.textContent = updatePopupText(cell.tokenValue);
  cachePopup.appendChild(popupText);

  const takeButton = createDocuElement("button", "take", "Take");
  cachePopup.appendChild(takeButton);

  const dropButton = createDocuElement("button", "drop", "Drop");
  cachePopup.appendChild(dropButton);

  circle.bindPopup(() => {
    // Updates user hand and token value inside cell
    // Updates status panel and popup text
    takeButton.onclick = () => {
      if (cell.tokenValue > 0) {
        if (userHand === cell.tokenValue || userHand === 0) {
          userHand += cell.tokenValue;
          cell.tokenValue = 0;
          updatePanelText();
          checkWinCondition();
        } else {
          statusPanel.innerHTML =
            `Unequal proportions, cannot combine ${userHand} and ${cell.tokenValue}`;
        }
        popupText.textContent = updatePopupText(cell.tokenValue);
      }
    };

    dropButton.onclick = () => {
      if (cell.tokenValue === 0) {
        cell.tokenValue = userHand;
        userHand = 0;
        updatePanelText();
        popupText.textContent = updatePopupText(cell.tokenValue);
      }
    };

    return cachePopup;
  });
}

function createCache(lat: number, lon: number): CacheCell {
  const key = `${lat},${lon}`;
  const latLng = L.latLng(lat, lon);

  if (!cacheStorage.has(key)) {
    const initialValue = Math.floor(
      luck([lat, lon, "initialValue"].toString()) * 2,
    );
    const circleCache = L.circle(latLng, { radius: 7 }).addTo(map);

    cacheStorage.set(key, { tokenValue: initialValue, marker: circleCache });
  } else {
    cacheStorage.get(key)?.marker.addTo(map);
  }
  updateCacheColor(cacheStorage.get(key)!);

  return cacheStorage.get(key)!;
}

// Adds initial caches to the map by cell numbers
function createInitCaches(i: number, j: number) {
  const playerBounds = userMarker.getLatLng();
  const lat = playerBounds.lat + i * tileDegrees;
  const lon = playerBounds.lng + j * tileDegrees;

  createCache(lat, lon);
}

function createDocuElement(
  elementType: string,
  className: string,
  elementText: string,
): HTMLElement {
  const button = document.createElement(elementType);
  button.className = className;
  button.innerText = elementText;
  return button;
}

function updatePopupText(value: number): string {
  if (value <= 0) return "Empty";
  else if (value === 1) return `${value} twig`;
  else {
    return `${value} twigs`;
  }
}

function updatePanelText() {
  if (userHand === 1) statusPanel.innerHTML = `You have ${userHand} twig`;
  if (userHand > 0) statusPanel.innerHTML = `You have ${userHand} twigs`;
  else {
    statusPanel.innerHTML = emptyInventoryString;
  }
}

function moveUser(direction: "N" | "S" | "E" | "W") {
  const offset =
    { N: [.001, 0], S: [-.001, 0], E: [0, .001], W: [0, -.001] }[direction];
  userCoords.i += offset[0];
  userCoords.j += offset[1];
  userMarker.setLatLng([userCoords.i, userCoords.j]);
  map.panTo([userCoords.i, userCoords.j]);
}

// Creates custom control class for player movement buttons inside map
function createCustomControl(text: string, direction: "N" | "S" | "E" | "W") {
  const control = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function () {
      const button = L.DomUtil.create("button");
      button.innerHTML = text;
      button.onclick = () => {
        moveUser(direction);
      };

      return button;
    },
  });
  return control;
}

function displayVisibleCells(bounds: L.LatLngBounds) {
  // Removes unseen caches
  map.eachLayer((layer) => {
    if (layer instanceof L.Circle) {
      if (!bounds.contains(layer.getLatLng())) layer.remove();
    }
  });

  // Spawns cache cells within bounds and updates interactivity
  // Extrinsic state
  cacheStorage.forEach((cell, key) => {
    const [lat, lon] = key.split(",").map(parseFloat);
    const latLng = L.latLng(lat, lon);

    if (bounds.contains(latLng)) {
      createCache(lat, lon);
      updateCacheColor(cell);
    }
  });
}

function cacheInteractable(userBounds: L.LatLng, cache: L.LatLng): boolean {
  const userDistance = map.distance(userBounds, cache);

  return userDistance <= interactionRadius;
}

function triggerWin() {
  L.popup()
    .setLatLng(map.getCenter())
    .setContent(`<b class="win-popup">🪹Bird nest complete!🪹</b>`)
    .openOn(map);
}

function checkWinCondition() {
  if (userHand >= winStateValue) {
    triggerWin();
  }
}

function updateCacheColor(cell: CacheCell) {
  const userBounds = userMarker.getLatLng();

  if (!cacheInteractable(userBounds, cell.marker.getLatLng())) {
    cell.marker.setStyle({ color: "gray" });
  } else {
    cell.marker.setStyle({ color: "blue" });
    attachPopup(cell.marker, cell);
  }
}
