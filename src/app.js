import {
  loadData,
  activeSnapshot,
  loadHistoricalIndex,
  loadHistoricalGeoJSON
} from "./data.js";
import { getDeterministicColor, escapeHtml } from "./utils.js";
import { createTheme } from "./theme.js";
import { createPanel } from "./panel.js";
import { createTimeline } from "./timeline.js";
import { createThemeSwitcher } from "./theme-switcher.js";


// CARTE
const worldBounds = L.latLngBounds(
  L.latLng(-90, -180),
  L.latLng(90, 180)
);

const map = L.map("map", {
  center: [30, 0],
  zoom: 2,
  minZoom: 2,
  maxZoom: 10,

  zoomControl: true,

  maxBounds: worldBounds,
  maxBoundsViscosity: 1.0
});

map.scrollWheelZoom.disable();


// ============================================================
// FOND DE CARTE
// ============================================================

L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}{r}.png",
  {
    attribution: "Fond de carte © OpenStreetMap",
    opacity: 0.4,
    noWrap: true,
    bounds: worldBounds
  }
).addTo(map);


// ============================================================
// LAYERS
// ============================================================

let regionsLayer = null;
let eventsLayer = null;


// ============================================================
// HISTORICAL BASEMAP
// ============================================================

let historicalIndex = null;

// Nom du dernier fichier réellement affiché.
// Permet d'éviter de recréer le layer lorsque le slider
// passe de 1000 à 1005, 1010, etc. alors que le snapshot
// historique reste world_1000.geojson.
let displayedHistoricalFilename = null;

// Identifiant de requête.
// Évite qu'une requête ancienne écrase une requête plus récente
// lorsque l'utilisateur déplace rapidement le slider.
let historicalRequestId = 0;


// ============================================================
// MAIN
// ============================================================

async function main() {

  const { regions, events } = await loadData();

  // Index historique chargé une seule fois.
  historicalIndex = await loadHistoricalIndex();

  console.log(
    "Snapshots historiques disponibles :",
    historicalIndex.length
  );


  const Theme = createTheme(
    regions,
    events
  );

  const activeSnapshotFunc = activeSnapshot;


  // ==========================================================
  // PANEL
  // ==========================================================

  const Panel = createPanel({
    REGIONS: regions,
    EVENTS: events,
    Theme,

    MapRenderer: {

      setYear: (year) => {
        updateMapForYear(
          year,
          regions,
          events,
          Theme,
          activeSnapshotFunc
        );
      },
      setSelectedEvent: (eventIdx) => {

        if (!eventsLayer) {
          return;
        }

        eventsLayer.eachLayer((layer) => {

          const isSelected =
            layer.options.eventIndex === eventIdx;

          layer.setStyle({
            radius:
              eventIdx === null
                ? 5
                : isSelected
                  ? 8
                  : 5,

            fillOpacity:
              eventIdx === null
                ? 0.3
                : isSelected
                  ? 1
                  : 0.8,

            color:
              isSelected
                ? "#7a2e1f"
                : "#3a2c1a",

            weight:
              isSelected
                ? 3
                : 1
          });

        });
      },

      get year() {
        return parseInt(
          document.getElementById("year-slider").value,
          10
        );
      },


      refresh: () => {

        const year = parseInt(
          document.getElementById("year-slider").value,
          10
        );

        updateMapForYear(
          year,
          regions,
          events,
          Theme,
          activeSnapshotFunc
        );
      }
    },

    activeSnapshot: activeSnapshotFunc
  });


  // ==========================================================
  // THEME SWITCHER
  // ==========================================================

  const ThemeSwitcher = createThemeSwitcher({
    REGIONS: regions,
    EVENTS: events,
    Theme,

    MapRenderer: {

      refresh: () => {

        const year = parseInt(
          document.getElementById("year-slider").value,
          10
        );
        
        
        updateMapForYear(
          year,
          regions,
          events,
          Theme,
          activeSnapshotFunc
        );
      },


      get year() {
        return parseInt(
          document.getElementById("year-slider").value,
          10
        );
      },

      getHistoricalLegend() {
        if (!regionsLayer) return [];
      
        const values = new Map(); // Utilise une Map pour éviter les doublons
      
        regionsLayer.eachLayer(layer => {
          const props = layer.feature?.properties || {};
          const value = cleanValue(props.SUBJECTO) || cleanValue(props.NAME);
          if (value && value !== "Entité inconnue" && !values.has(value)) {
            values.set(value, getDeterministicColor(value));
          }
        });
      
        // Retourne un tableau de {value, color}
        return Array.from(values.entries()).map(([value, color]) => ({ value, color }));
      },

    },

    activeSnapshot: activeSnapshotFunc,

    Panel
  });


  // ==========================================================
  // TIMELINE
  // ==========================================================

  const Timeline = createTimeline({
    MapRenderer: {

      setYear: (year) => {

        document.getElementById(
          "year-slider"
        ).value = year;

        updateMapForYear(
          year,
          regions,
          events,
          Theme,
          activeSnapshotFunc
        );
      },


      get year() {
        return parseInt(
          document.getElementById("year-slider").value,
          10
        );
      },


      refresh: () => {

        const year = parseInt(
          document.getElementById("year-slider").value,
          10
        );

        updateMapForYear(
          year,
          regions,
          events,
          Theme,
          activeSnapshotFunc
        );
      }
    },

    ThemeSwitcher,
    Panel
  });


  // ==========================================================
  // LAYERS
  // ==========================================================

  await initGeoJSONLayers(
    regions,
    events,
    Theme,
    Panel,
    activeSnapshotFunc
  );


  ThemeSwitcher.init();
  Timeline.init();
}


// ============================================================
// INITIALISATION DES LAYERS
// ============================================================

async function initGeoJSONLayers(
  regions,
  events,
  Theme,
  Panel,
  activeSnapshot
) {

  const currentYear =
    parseInt(
      document.getElementById("year-slider").value,
      10
    ) || 1000;


  // ==========================================================
  // FRONTIÈRES HISTORIQUES
  // ==========================================================

  await updateHistoricalBorders(
    currentYear,
    Theme
  );


  // ==========================================================
  // ÉVÉNEMENTS
  // ==========================================================

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

        ...event
      },

      geometry: {
        type: "Point",

        coordinates: [
          parseFloat(event.lon),
          parseFloat(event.lat)
        ]
      }

    }))
  };


  eventsLayer = L.geoJSON(
    eventsGeoJSON,
    {

      pointToLayer: (feature, latlng) => {

        return L.circleMarker(
          latlng,
          {

            radius: 5,

            fillColor:
              Theme.colorFor(
                Theme.current,
                feature.properties[
                  Theme.current
                ] || "#fff"
              ),

            color: "#3a2c1a",

            weight: 1,

            fillOpacity: 0.3,

            eventIndex:
              feature.properties.eventIndex
          }
        );
      },


      onEachFeature: (
        feature,
        layer
      ) => {

        layer.on(
          "click",
          (e) => {

            e.originalEvent.stopPropagation();

            Panel.showEvent(
              feature.properties.eventIndex,
              {
                type: "region",
                id: feature.properties.regionId
              }
            );
          }
        );

      }

    }
  ).addTo(map);


  // Première mise à jour.
  await updateMapForYear(
    currentYear,
    regions,
    events,
    Theme,
    activeSnapshot
  );
}


// ============================================================
// FRONTIÈRES HISTORIQUES
// ============================================================

async function updateHistoricalBorders(
  year,
  Theme
) {

  const requestId =
    ++historicalRequestId;


  try {

    const historical =
      await loadHistoricalGeoJSON(year);


    // Une requête plus récente existe.
    if (requestId !== historicalRequestId) {
      return;
    }


    // --------------------------------------------------------
    // IMPORTANT :
    //
    // Si le fichier historique est identique à celui affiché,
    // inutile de reconstruire le layer.
    // --------------------------------------------------------

    if (
      displayedHistoricalFilename ===
      historical.filename
    ) {

      updateHistoricalBorderStyles(
        Theme
      );

      return;
    }


    // --------------------------------------------------------
    // Supprime l'ancien layer.
    // --------------------------------------------------------

    if (regionsLayer) {

      map.removeLayer(
        regionsLayer
      );

      regionsLayer = null;
    }


    // --------------------------------------------------------
    // Crée le nouveau layer.
    // --------------------------------------------------------

    regionsLayer = L.geoJSON(
      historical.geojson,
      {

        style: (feature) => {

          return historicalBorderStyle(
            feature,
            Theme
          );
        },


        onEachFeature: (
          feature,
          layer
        ) => {

          setupHistoricalFeature(
            feature,
            layer
          );
        }

      }
    );


    regionsLayer.addTo(map);


    // Mémorise le snapshot affiché.
    displayedHistoricalFilename =
      historical.filename;


    // Les événements doivent rester au-dessus.
    if (eventsLayer) {
      eventsLayer.bringToFront();
    }


    console.log(
      `Carte historique : ${historical.year} → ${historical.filename}`
    );

  }
  catch (error) {

    console.error(
      `Erreur de chargement de la carte historique pour ${year}`,
      error
    );

  }
}


// ============================================================
// STYLE DES FRONTIÈRES
// ============================================================

function historicalBorderStyle(
  feature,
  Theme
) {

  const props =
    feature?.properties || {};

  const precision =
    Number(
      props.BORDERPRECISION
    ) || 2;


  // ==========================================================
  // MODE TERRITOIRE
  // ==========================================================
  if (
    Theme.current === "territory"
  ) {

    const subject =
      cleanValue(
        props.SUBJECTO
      ) ||
      cleanValue(
        props.NAME
      ) ||
      "Entité inconnue"; // Modifié ici pour correspondre à votre condition

    // Ajustement de l'opacité selon le sujet
    const fillOpacity =
      subject === "Entité inconnue"
        ? 0 // Transparence pure
        : precision === 3
          ? 0.38
          : precision === 2
            ? 0.30
            : 0.22;


    return {

      // On applique une couleur transparente ou générée
      fillColor:
        subject === "Entité inconnue"
          ? "transparent"
          : getDeterministicColor(subject),

      fillOpacity,

      color:
        precision === 3
          ? "#3a2c1a"
          : "#6b5a45",

      weight:
        precision === 3
          ? 1
          : 0.7,

      opacity:
        precision === 3
          ? 0.9
          : 0.55
    };
  }



  // ==========================================================
  // AUTRES MODES
  // ==========================================================
  //
  // Aourednik ne fournit pas directement religion/langue/ethnie
  // pour chaque polygon.
  //
  // On garde donc les frontières visibles mais neutres.
  //

  return {

    fillColor:
      "#ffffff",

    fillOpacity:
      0,

    color:
      "#6b5a45",

    weight:
      precision === 3
        ? 1
        : 0.7,

    opacity:
      precision === 3
        ? 0.75
        : 0.45
  };
}


// ============================================================
// MET À JOUR LES STYLES SANS RECHARGER LE GEOJSON
// ============================================================

function updateHistoricalBorderStyles(
  Theme
) {

  if (!regionsLayer) {
    return;
  }

  regionsLayer.eachLayer(
    (layer) => {

      if (!layer.feature) {
        return;
      }

      layer.setStyle(
        historicalBorderStyle(
          layer.feature,
          Theme
        )
      );
    }
  );
}


// ============================================================
// INTERACTION FRONTIÈRE HISTORIQUE
// ============================================================

function setupHistoricalFeature(
  feature,
  layer
) {

  const props =
    feature?.properties || {};


  const name =
    cleanValue(
      props.NAME
    ) ||
    "Entité inconnue";


  const subject =
    cleanValue(
      props.SUBJECTO
    );


  const partOf =
    cleanValue(
      props.PARTOF
    );


  let html =
    `<strong>${escapeHtml(name)}</strong>`;


  if (
    subject &&
    subject !== name
  ) {

    html +=
      `<br>${escapeHtml(subject)}`;
  }


  if (partOf) {

    html +=
      `<br><small>${escapeHtml(partOf)}</small>`;
  }


  layer.bindTooltip(
    html,
    {
      sticky: true,
      direction: "top"
    }
  );


  // ----------------------------------------------------------
  // Pour l'instant :
  //
  // on NE fait PAS Panel.showRegionOrGroup(name)
  //
  // car NAME n'est pas l'id de ton regions.json.
  //
  // Le mapping viendra dans une deuxième étape.
  // ----------------------------------------------------------
}


// ============================================================
// UPDATE GLOBAL
// ============================================================

async function updateMapForYear(
  year,
  regions,
  events,
  Theme,
  activeSnapshot
) {

  // ----------------------------------------------------------
  // 1. FRONTIÈRES
  // ----------------------------------------------------------

  await updateHistoricalBorders(
    year,
    Theme
  );


  // ----------------------------------------------------------
  // 2. ÉVÉNEMENTS
  // ----------------------------------------------------------

  if (eventsLayer) {

    eventsLayer.eachLayer(
      (layer) => {

        const eventIndex =
          layer.options.eventIndex;

        const event =
          events[eventIndex];


        if (!event) {
          return;
        }


        const visible =
          event.year <= year;


        layer.setStyle({

          fillOpacity:
            visible
              ? 0.3
              : 0,

          opacity:
            visible
              ? 1
              : 0,

          weight:
            visible
              ? 1
              : 0
        });


        if (visible) {

          if (
            year - event.year <= 30
          ) {

            layer.setRadius(8);

          } else {

            layer.setRadius(5);
          }

        } else {

          layer.setRadius(0);
          layer.closePopup();
        }

      }
    );
  }


  // ----------------------------------------------------------
  // 3. COULEUR DES ÉVÉNEMENTS
  // ----------------------------------------------------------

  updateEventStyles(
    events,
    Theme
  );
}


// ============================================================
// ÉVÉNEMENTS : MISE À JOUR DES COULEURS
// ============================================================

function updateEventStyles(
  events,
  Theme
) {

  if (!eventsLayer) {
    return;
  }


  eventsLayer.eachLayer(
    (layer) => {

      const eventIndex =
        layer.options.eventIndex;

      const event =
        events[eventIndex];


      if (!event) {
        return;
      }


      const value =
        event[Theme.current] ||
        "#fff";


      layer.setStyle({

        fillColor:
          Theme.colorFor(
            Theme.current,
            value
          )

      });

    }
  );
}


// ============================================================
// UTILITAIRES
// ============================================================

function cleanValue(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";
  }

  return String(value).trim();
}


// ============================================================
// START
// ============================================================

main().catch(
  (error) => {

    console.error(error);

    const hint =
      document.getElementById(
        "empty-hint"
      );

    if (hint) {

      hint.textContent =
        "Erreur de chargement des données. Utilisez un serveur local.";
    }
  }
);