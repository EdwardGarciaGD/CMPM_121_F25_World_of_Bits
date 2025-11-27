import * as L from "leaflet";
import "leaflet/dist/leaflet.css"; // Supporting style for Leaflet
import "./_leafletWorkaround.ts"; // Fixes for missing Leaflet images
import luck from "./_luck.ts";
import playerIconURL from "./Player Icon.jpg"; // User marker icon
import "./style.css";

// Movement system with Facade design pattern
class MovementFacade {
  private isGeolocationActive: boolean = false;
  private readonly GEOLOCATION_OPTIONS = {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 5000,
  };

  constructor() {
    this.init();
  }

  private init() {
    if ("geolocation" in navigator) {
      this.startGeolocation();
    } else {
      this.setupManualControls();
      if (!isInitFirstTime) randomizeCacheLocations();
    }
  }

  // User Geolocation movement setup
  private startGeolocation() {
    const success = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      this.updateUserPosition(latitude, longitude);
      this.isGeolocationActive = true;
      if (!isInitFirstTime) randomizeCacheLocations();
    };

    const error = (err: GeolocationPositionError) => {
      console.warn("Geolocation failed:", err.message);
      this.setupManualControls();
      if (!isInitFirstTime) randomizeCacheLocations();
    };

    navigator.geolocation.watchPosition(
      success,
      error,
      this.GEOLOCATION_OPTIONS,
    );
  }

  private updateUserPosition(lat: number, lng: number) {
    userCoords.i = lat;
    userCoords.j = lng;
    userMarker.setLatLng([lat, lng]);
    map.panTo([lat, lng]);
  }

  private setupManualControls() {
    if (this.isGeolocationActive) return;

    const directions = ["N", "S", "E", "W"] as const;
    const positions = {
      N: "bottomleft",
      S: "bottomleft",
      E: "bottomleft",
      W: "bottomleft",
    } as const;

    directions.forEach((dir) => {
      const ControlClass = createCustomControl(
        dir === "N" ? "▲" : dir === "S" ? "▼" : dir === "E" ? "▶" : "◀",
        dir,
      );
      const control = new ControlClass({ position: positions[dir] });
      control.addTo(map);
    });
  }

  // Unified control movement
  public move(direction: "N" | "S" | "E" | "W") {
    moveUser(direction);
  }

  public refresh() {
    if (!this.isGeolocationActive) {
      const currPosition = userMarker.getLatLng();
      this.updateUserPosition(currPosition.lat, currPosition.lng);
    }
  }

  public stop() {
    this.isGeolocationActive = false;
  }
}

type coordinates = {
  i: number;
  j: number;
};

type userState = {
  userCoordinates: coordinates;
  userHand: number;
  cacheValues: { [key: string]: number };
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
const tileDegrees = 14e-4;
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

let isInitFirstTime = false;

// User's inventory/hand
let userHand = 0;
statusPanel.innerHTML = emptyInventoryString;

// Load saved state try
const loadedState = loadState();
if (loadedState) {
  userCoords.i = loadedState.userCoordinates.i;
  userCoords.j = loadedState.userCoordinates.j;
  userHand = loadedState.userHand;
  updatePanelText();
  userMarker.setLatLng([userCoords.i, userCoords.j]);
  map.panTo([userCoords.i, userCoords.j]);

  // Restore cache values
  Object.entries(loadedState.cacheValues).forEach(([key, value]) => {
    const [lat, lng] = key.split(",").map(parseFloat);
    createCache(lat, lng, value);
  });

  isInitFirstTime = true;
} else {
  console.log("No save found. Starting new game.");
}

const movementSystem = new MovementFacade();

const NewGameControl = L.Control.extend({
  onAdd: function () {
    const button = L.DomUtil.create("button", "new-game-button");
    button.innerHTML = "New Game";
    button.title = "Start a new game (resets everything)";
    button.onclick = () => {
      if (confirm("Start a new game? Your progress will be lost.")) {
        createNewGame();
      }
    };
    return button;
  },
});
new NewGameControl({ position: "topright" }).addTo(map);

map.on("moveend", () => {
  const userBounds = map.getBounds();
  displayVisibleCells(userBounds);
  updateAndSaveGame();
});

function randomizeCacheLocations() {
  // Initial caches creation
  for (let i = 0; i < totalCaches; i++) {
    const lat = Math.random() * 180 - 90;
    const lon = Math.random() * 360 - 180;
    if (luck([lat, lon].toString()) < cacheSpawnProbability) {
      createInitCaches(lat, lon);
    }
  }
  isInitFirstTime = true;
}

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
          updateAndSaveGame();
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
        updateAndSaveGame();
        popupText.textContent = updatePopupText(cell.tokenValue);
      }
    };

    return cachePopup;
  });
}

function createCache(lat: number, lon: number, value: number = -1): CacheCell {
  const key = `${lat},${lon}`;
  const latLng = L.latLng(lat, lon);

  if (!cacheStorage.has(key)) {
    if (value < 0) {
      value = Math.floor(
        luck([lat, lon, "initialValue"].toString()) * 2,
      );
    }
    const circleCache = L.circle(latLng, { radius: 11 }).addTo(map);

    cacheStorage.set(key, { tokenValue: value, marker: circleCache });
  } else {
    cacheStorage.get(key)?.marker.addTo(map);
  }
  updateCacheColor(cacheStorage.get(key)!);

  return cacheStorage.get(key)!;
}

// Adds initial caches to the map by cell numbers
function createInitCaches(i: number, j: number) {
  const lat = userCoords.i + i * tileDegrees;
  const lon = userCoords.j + j * tileDegrees;

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

function getUserState(): userState {
  const savedCacheValues: { [key: string]: number } = {};
  cacheStorage.forEach((cell, key) => {
    savedCacheValues[key] = cell.tokenValue;
  });

  return {
    userCoordinates: userCoords,
    userHand: userHand,
    cacheValues: savedCacheValues,
  };
}

function updateAndSaveGame() {
  updatePanelText();
  checkWinCondition();
  saveState(getUserState());
}

function saveState(state: userState) {
  localStorage.setItem("BeachCombSave", JSON.stringify(state));
}

function loadState(): userState | null {
  try {
    const saved = localStorage.getItem("BeachCombSave");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Failed to load save data", error);
    return null;
  }
}

function createNewGame() {
  localStorage.removeItem("d3GameSave");

  userHand = 0;
  updatePanelText();

  movementSystem.refresh();

  cacheStorage.forEach((cell) => {
    cell.marker.remove();
  });
  cacheStorage.clear();

  isInitFirstTime = false;
  randomizeCacheLocations();
}
