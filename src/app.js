import { loadData, activeSnapshot } from "./data.js";
import { createTheme } from "./theme.js";
import { createPanel } from "./panel.js";
import { createTimeline } from "./timeline.js";
import { createThemeSwitcher } from "./theme-switcher.js";

const worldBounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));

const map = L.map('map', {
  center: [30, 0], // Centre initial (latitude, longitude)
  zoom: 2, 
  minZoom: 2, 
  maxZoom: 10, // Augmenté pour le fond OSM mondial
  zoomControl: true, 
  maxBounds: worldBounds,  // Bloque le déplacement en dehors du monde
  maxBoundsViscosity: 1.0  // Effet de rebond rigide si l'utilisateur essaie de sortir
});

map.scrollWheelZoom.disable();

// Fond de carte historique/discret
L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}{r}.png', {
  attribution: 'Fond de carte © OpenStreetMap',
  opacity: 0.4, 
  noWrap: true,
  bounds: worldBounds      // Limite le chargement des tuiles à la zone du monde
}).addTo(map);

let regionsLayer;
let eventsLayer;

async function main() {
  const { regions, events } = await loadData();
  const Theme = createTheme(regions, events);
  const activeSnapshotFunc = activeSnapshot;

  let Panel = createPanel({
    REGIONS: regions,
    EVENTS: events,
    Theme,
    MapRenderer: {
      setYear: (year) => {
        updateMapForYear(year, regions, events, Theme, activeSnapshotFunc);
      },
      setSelectedEvent: (eventIdx) => {
        if (eventsLayer) {
          eventsLayer.eachLayer((layer) => {
            const isSelected = layer.options.eventIndex === eventIdx;
            layer.setStyle({
              radius: eventIdx === null ? 5 : (isSelected ? 8 : 5),
              fillOpacity: eventIdx === null ? 0.3 : (isSelected ? 1 : 0.8),
              color: isSelected ? "#7a2e1f" : "#3a2c1a",
              weight: isSelected ? 3 : 1,
            });
          });
        }
      },
      get year() {
        return parseInt(document.getElementById("year-slider").value, 10);
      },
      refresh: () => {
        const year = parseInt(document.getElementById("year-slider").value, 10);
        updateMapForYear(year, regions, events, Theme, activeSnapshotFunc);
      },
    },
    activeSnapshot: activeSnapshotFunc,
  });

  const ThemeSwitcher = createThemeSwitcher({
    REGIONS: regions,
    EVENTS: events,
    Theme,
    MapRenderer: {
      refresh: () => {
        const year = parseInt(document.getElementById("year-slider").value, 10);
        updateMapForYear(year, regions, events, Theme, activeSnapshotFunc);
      },
      get year() {
        return parseInt(document.getElementById("year-slider").value, 10);
      },
    },
    activeSnapshot: activeSnapshotFunc,
    Panel,
  });

  const Timeline = createTimeline({
    MapRenderer: {
      setYear: (year) => {
        document.getElementById("year-slider").value = year;
        updateMapForYear(year, regions, events, Theme, activeSnapshotFunc);
      },
      get year() {
        return parseInt(document.getElementById("year-slider").value, 10);
      },
      refresh: () => {
        const year = parseInt(document.getElementById("year-slider").value, 10);
        updateMapForYear(year, regions, events, Theme, activeSnapshotFunc);
      },
    },
    ThemeSwitcher,
    Panel,
  });

  initGeoJSONLayers(regions, events, Theme, Panel, activeSnapshotFunc);

  ThemeSwitcher.init();
  Timeline.init();

  document.getElementById("year-slider").addEventListener("input", (e) => {
    const year = parseInt(e.target.value, 10);
    updateMapForYear(year, regions, events, Theme, activeSnapshotFunc);
  });
}

function initGeoJSONLayers(regions, events, Theme, Panel, activeSnapshot) {
  const currentYear = parseInt(document.getElementById("year-slider").value, 10) || 1000;

  // Régions au format GeoJSON standard [lon, lat]
  const regionsGeoJSON = {
    type: "FeatureCollection",
    features: regions.map((region) => ({
      type: "Feature",
      properties: {
        id: region.id,
        name: region.name,
        ...region.snapshots[0], 
      },
      geometry: {
        type: "Polygon",
        coordinates: [convertGeometryToGeoJSON(region.snapshots[0].geometry)],
      },
    })),
  };

  // Événements au format GeoJSON standard [lon, lat]
  const eventsGeoJSON = {
    type: "FeatureCollection",
    features: events.map((event, index) => ({
      type: "Feature",
      properties: {
        id: `event-${index}`,
        eventIndex: index,
        title: event.title,
        year: event.year,
        regionId: event.regionId,
        ...event, 
      },
      geometry: {
        type: "Point",
        coordinates: [parseFloat(event.lon), parseFloat(event.lat)],
      },
    })),
  };

  // Ajout des régions
  regionsLayer = L.geoJSON(regionsGeoJSON, {
    style: (feature) => {
      const region = regions.find((r) => r.id === feature.properties.id);
      if (!region) return {};
      const snap = activeSnapshot(region, currentYear);
      return {
        fillColor: Theme.colorFor(Theme.current, snap[Theme.current]),
        color: Theme.current === "territory" ? "var(--ink)" : "none",
        weight: Theme.current === "territory" ? 1 : 0,
        fillOpacity: 0.3,
      };
    },
    onEachFeature: (feature, layer) => {
      layer.on("click", () => {
        Panel.showRegionOrGroup(feature.properties.id);
      });
    },
  }).addTo(map);

  // Ajout des événements (Correction de l'inversion latlng géographique de Leaflet)
  eventsLayer = L.geoJSON(eventsGeoJSON, {
    pointToLayer: (feature, latlng) => {
      // Leaflet L.geoJSON inverse automatiquement le [lon, lat] du GeoJSON en [lat, lon] utilisable pour L.circleMarker
      return L.circleMarker(latlng, {
        radius: 5,
        fillColor: Theme.colorFor(Theme.current, feature.properties[Theme.current] || "#fff"),
        color: "#3a2c1a",
        weight: 1,
        fillOpacity: 0.3,
        eventIndex: feature.properties.eventIndex,
      });
    },
    onEachFeature: (feature, layer) => {
      layer.on("click", (e) => {
        e.originalEvent.stopPropagation(); 
        Panel.showEvent(feature.properties.eventIndex, {
          type: "region",
          id: feature.properties.regionId,
        });
      });
    },
  }).addTo(map);

  // Optionnel : Forcer la mise à jour immédiate pour l'année initiale du slider
  updateMapForYear(currentYear, regions, events, Theme, activeSnapshot);
}

// Format GeoJSON standard : [longitude, latitude]
function convertGeometryToGeoJSON(geometry) {
  return geometry.map(([lon, lat]) => [parseFloat(lon), parseFloat(lat)]);
}

function updateMapForYear(year, regions, events, Theme, activeSnapshot) {
  if (regionsLayer) {
    regionsLayer.eachLayer((layer) => {
      const region = regions.find((r) => r.id === layer.feature.properties.id);
      if (region) {
        const snap = activeSnapshot(region, year);
        layer.setStyle({
          fillColor: Theme.colorFor(Theme.current, snap[Theme.current]),
          color: Theme.current === "territory" ? "var(--ink)" : "none",
          weight: Theme.current === "territory" ? 1 : 0,
          fillOpacity: 0.3,
        });
        layer.feature.properties = { ...layer.feature.properties, ...snap };
      }
    });
  }

  if (eventsLayer) {
    eventsLayer.eachLayer((layer) => {
      const eventIndex = layer.options.eventIndex;
      const event = events[eventIndex];
      const visible = event.year <= year;
      
      // Gestion de la visibilité des événements passés/futurs
      layer.setStyle({
        fillOpacity: visible ? 0.3 : 0,
        opacity: visible ? 1 : 0,
        weight: visible ? 1 : 0
      });

      if (visible) {
        // Effet de pulsation ou agrandissement pour les événements récents (< 30 ans)
        if (year - event.year <= 30) {
          layer.setRadius(8);
        } else {
          layer.setRadius(5);
        }
      } else {
        layer.setRadius(0);
        layer.closePopup();
      }
    });
  }
}

main().catch((error) => {
  console.error(error);
  const hint = document.getElementById("empty-hint");
  if (hint) hint.textContent = "Erreur de chargement des données. Utilisez un serveur local.";
});