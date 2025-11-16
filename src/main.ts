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

// Gameplay parameters
const emptyInventoryString = "You are holding nothing";
const mapZoomLevel = 17;
const minMapZoomLevel = 14;
const maxMapZoomLevel = 18;
const tileDegrees = 13e-4;
const cacheSpawnProbability = 0.6;
const interactionRadius = 220;
const userCoords: coordinates = {
  i: 36.997936938057016,
  j: -122.05703507501151,
};
const startingLocation = L.latLng(
  userCoords.i,
  userCoords.j,
);

let cacheRecreate = false;

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

// User's inventory
let userHand = 0;
statusPanel.innerHTML = emptyInventoryString;

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

// Stored cache locations throughout map
const cacheCoordSet = new Set<string>();

// Initial cache creation
const totalCaches = 80000;
for (let i = 0; i < totalCaches; i++) {
  const lat = Math.random() * 180 - 90;
  const lon = Math.random() * 360 - 180;
  if (luck([lat, lon].toString()) < cacheSpawnProbability) {
    spawnCache(lat, lon);
  }
}

map.on("moveend", () => {
  const userBounds = map.getBounds();
  displayVisibleCells(userBounds);
});

// Adds caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  const playerBounds = userMarker.getLatLng();
  let lat;
  let lon;

  // Checks if caches need initial creation
  if (!cacheRecreate) {
    lat = playerBounds.lat + i * tileDegrees;
    lon = playerBounds.lng + j * tileDegrees;
  } else {
    lat = i;
    lon = j;
  }
  const bounds = L.latLng([
    lat,
    lon,
  ]);

  cacheCoordSet.add(`${bounds.lat},${bounds.lng}`);

  let cellTokenValue = Math.floor(luck([i, j, "initialValue"].toString()) * 2);

  // Element creations for cache tokens
  const cachePopup = document.createElement("div");

  const popupText = document.createElement("p");
  popupText.textContent = updatePopupText(cellTokenValue);
  cachePopup.appendChild(popupText);

  const takeButton = createDocuElement("button", "take", "Take");
  cachePopup.appendChild(takeButton);

  const dropButton = createDocuElement("button", "drop", "Drop");
  cachePopup.appendChild(dropButton);

  const circleCache = L.circle(bounds, { radius: 7 }).addTo(map);

  if (!cacheInteractable(playerBounds, circleCache.getLatLng())) {
    circleCache.setStyle({ color: "gray" });
  } else {
    circleCache.bindPopup(() => {
      // Updates player Inventory and token value inside cell
      // Updates status panel and popup text
      takeButton.addEventListener("click", () => {
        if (cellTokenValue > 0) {
          if (userHand === cellTokenValue || userHand === 0) {
            userHand += cellTokenValue;
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
          cellTokenValue = userHand;
          userHand = 0;
          statusPanel.innerHTML = updatePanelText();
          popupText.textContent = updatePopupText(cellTokenValue);
        }
      });

      return cachePopup;
    });
  }
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

function updatePanelText(): string {
  if (userHand === 1) return `You have ${userHand} twig`;
  if (userHand > 0) return `You have ${userHand} twigs`;
  else {
    return emptyInventoryString;
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
  const visibleCells = new Set<string>();

  clearMapFromCells();

  // Cache recreation
  cacheCoordSet.forEach((key) => {
    const [latStr, lonStr] = key.split(",").map((s) => s.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) return;

    if (bounds.contains([lat, lon])) {
      cacheRecreate = true;
      spawnCache(lat, lon);
      visibleCells.add(key);
    }
  });
  cacheRecreate = false;
}

function clearMapFromCells() {
  map.eachLayer((layer) => {
    if (layer instanceof L.Circle) {
      layer.remove();
    }
  });
}

function cacheInteractable(userBounds: L.LatLng, cache: L.LatLng): boolean {
  const userDistance = map.distance(userBounds, cache);

  return userDistance <= interactionRadius;
}

//function checkWinCondition() {
//}
