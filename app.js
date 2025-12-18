async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return await res.json();
}

function pct(x) {
  return x == null ? null : x * 100;
}

/* ------------------ INDEX ------------------ */
async function renderIndex() {
  const data = await fetchJSON("/api/by_year");

  const years = data.map(d => d.annee);
  const insertion = data.map(d => pct(d.taux_dinsertion_moy));
  const salaire = data.map(d => d.salaire_median);

  Plotly.newPlot(
    "chart_by_year_rates",
    [{ x: years, y: insertion, mode: "lines+markers", name: "Taux d’insertion (%)" }],
    {
      margin: { t: 20, l: 55, r: 20, b: 45 },
      xaxis: { title: "Année" },
      yaxis: { title: "Pourcentage" },
      legend: { orientation: "h" }
    }
  );

  Plotly.newPlot(
    "chart_by_year_salary",
    [{ x: years, y: salaire, mode: "lines+markers", name: "Salaire net médian (€/mois)" }],
    {
      margin: { t: 20, l: 55, r: 20, b: 45 },
      xaxis: { title: "Année" },
      yaxis: { title: "Salaire net médian" }
    }
  );
}

/* ------------------ DOMAINES (sans filtres) ------------------ */
async function renderDomaines() {
  const raw = await fetchJSON("/api/by_domaine");

  const topN = 15;
  const sorted = [...raw].sort((a, b) => (b.taux_dinsertion_moy ?? 0) - (a.taux_dinsertion_moy ?? 0));
  const top = sorted.slice(0, topN);

  // Bar horizontal (Top insertion)
  Plotly.newPlot(
    "chart_domaines_bar",
    [{
      x: top.slice().reverse().map(d => pct(d.taux_dinsertion_moy)),
      y: top.slice().reverse().map(d => d.domaine),
      type: "bar",
      orientation: "h",
      name: "Insertion"
    }],
    {
      margin: { t: 20, l: 240, r: 20, b: 45 },
      xaxis: { title: "Taux d’insertion moyen (%)" }
    }
  );

  // Combo : insertion (bar) + salaire (line)
  Plotly.newPlot(
    "chart_domaines_scatter",
    [
      {
        x: top.map(d => d.domaine),
        y: top.map(d => pct(d.taux_dinsertion_moy)),
        type: "bar",
        name: "Insertion (%)"
      },
      {
        x: top.map(d => d.domaine),
        y: top.map(d => d.salaire_median),
        type: "scatter",
        mode: "lines+markers",
        name: "Salaire médian (€ / mois)",
        yaxis: "y2"
      }
    ],
    {
      margin: { t: 20, l: 60, r: 60, b: 170 },
      xaxis: { title: "Domaine", tickangle: -35 },
      yaxis: { title: "Taux d’insertion (%)" },
      yaxis2: { title: "Salaire médian (€ / mois)", overlaying: "y", side: "right" },
      legend: { orientation: "h" }
    }
  );
}

/* ------------------ ACADEMIES : carte REGIONS + tops (sans filtres) ------------------ */
async function renderAcademies() {
  const academies = await fetchJSON("/api/by_academie");

  // --- Carte choroplèthe par régions ---
  const regions = await fetchJSON("/api/by_region");
  const geo = await fetchJSON("/static/geo/regions.geojson");

  Plotly.newPlot(
    "map_regions",
    [{
      type: "choropleth",
      geojson: geo,
      featureidkey: "properties.nom",
      locations: regions.map(r => r.region),
      z: regions.map(r => pct(r.taux_dinsertion_moy)),
      customdata: regions.map(r => [r.salaire_median, r.n]),
      colorbar: { title: "Insertion (%)" },
      hovertemplate:
        "<b>%{location}</b><br>" +
        "Insertion: %{z:.1f}%<br>" +
        "Salaire médian: %{customdata[0]} €<br>" +
        "n: %{customdata[1]:.0f}" +
        "<extra></extra>"
    }],
    {
      margin: { t: 10, l: 10, r: 10, b: 10 },
      geo: { fitbounds: "locations", visible: false }
    }
  );

  // --- Graphes académie ---
  const topN = 20;
  const sorted = [...academies].sort((a, b) => (b.taux_dinsertion_moy ?? 0) - (a.taux_dinsertion_moy ?? 0));
  const top = sorted.slice(0, topN);

  // Bar horizontal (Top insertion)
  Plotly.newPlot(
    "chart_academies_bar",
    [{
      x: top.slice().reverse().map(d => pct(d.taux_dinsertion_moy)),
      y: top.slice().reverse().map(d => d.academie),
      type: "bar",
      orientation: "h",
      name: "Insertion"
    }],
    {
      margin: { t: 20, l: 240, r: 20, b: 45 },
      xaxis: { title: "Taux d’insertion moyen (%)" }
    }
  );

  // Combo : insertion (bar) + salaire (line)
  Plotly.newPlot(
    "chart_academies_scatter",
    [
      {
        x: top.map(d => d.academie),
        y: top.map(d => pct(d.taux_dinsertion_moy)),
        type: "bar",
        name: "Insertion (%)"
      },
      {
        x: top.map(d => d.academie),
        y: top.map(d => d.salaire_median),
        type: "scatter",
        mode: "lines+markers",
        name: "Salaire médian (€ / mois)",
        yaxis: "y2"
      }
    ],
    {
      margin: { t: 20, l: 60, r: 60, b: 170 },
      xaxis: { title: "Académie", tickangle: -35 },
      yaxis: { title: "Taux d’insertion (%)" },
      yaxis2: { title: "Salaire médian (€ / mois)", overlaying: "y", side: "right" },
      legend: { orientation: "h" }
    }
  );
}

/* ------------------ MAIN ------------------ */
(async function main() {
  const page = document.body.getAttribute("data-page");
  try {
    if (page === "index") await renderIndex();
    if (page === "domaines") await renderDomaines();
    if (page === "academies") await renderAcademies();
  } catch (e) {
    console.error(e);
    alert("Erreur chargement données/graphes: " + e.message);
  }
})();