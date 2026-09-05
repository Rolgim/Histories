import { escapeHtml } from "./utils.js";

export function createThemeSwitcher({ Theme, MapRenderer, Panel }) {
  const modeRow = document.getElementById("mode-row");
  const legendRow = document.getElementById("legend-row");
  const chips = {};

  function renderLegend() {
    const year = MapRenderer.year;

    // Entités politiques : la légende vient du GeoJSON historique
    if (Theme.current === "territory") {
      const active = MapRenderer.getHistoricalLegend(); // tableau de {value, color}

      legendRow.innerHTML = "";
      active.forEach(({ value, color }) => {
        const s = document.createElement("div");
        s.className = "swatch";
        s.innerHTML = `<i style="background:${color}"></i>${escapeHtml(value)}`;
        legendRow.appendChild(s);
      });

      return;
    }

    // Religion / langue / ethnie : top N + "Autres" (voir theme.js)
    const entries = Theme.legendEntries(Theme.current, year);

    legendRow.innerHTML = "";
    entries.forEach(({ value, color, isOther }) => {
      const s = document.createElement("div");
      s.className = "swatch" + (isOther ? " swatch-other" : "");
      s.title = isOther
        ? "Valeurs moins fréquentes regroupées"
        : "";
      s.innerHTML = `<i style="background:${color}"></i>${escapeHtml(value)}`;
      legendRow.appendChild(s);
    });
  }

  function init() {
    Theme.MODES.forEach((m) => {
      const chip = document.createElement("button");
      chip.className = "chip" + (m.key === Theme.current ? " active" : "");
      chip.textContent = m.label;

      chip.addEventListener("click", () => {
        Theme.current = m.key;
        Object.values(chips).forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        renderLegend();
        MapRenderer.refresh();
        Panel.refreshOpenPanel();
      });

      modeRow.appendChild(chip);
      chips[m.key] = chip;
    });

    renderLegend();
  }

  return { init, renderLegend };
}
