# 3D Stellar Projection Map

**Live demo:** [mariusthatsme.github.io/starmap](https://mariusthatsme.github.io/starmap/)

An interactive map of nearby stars that shows each star’s true position in 3D space and how it appears on a flat chart—without distorting distance.

## What it does

Most flat star maps treat height above or below the chart plane as something to ignore. Drop a star straight down onto the grid and you get its *horizontal* distance, not how far away it really is.

This viewer uses a **range-preserving projection**: each star’s position on the flat chart is placed at the same radial distance from the focus star as its true 3D distance. Curved **elevation arcs** connect the real star to its chart position, so you can see how “height” is folded onto the plane.

By default the map is centered on **Sol**, showing the nearest stars from a catalog of everything within 25 parsecs (~5,700 stars). You can click any star and **focus** the map on it to explore its neighborhood.

## Features

- **3D view** — real star positions with spectral colors and brightness-scaled markers
- **Projection chart** — grid points on an azimuthal equidistant plane where radial distance equals true 3D distance
- **Elevation arcs** — curved connectors from each star to its projected position
- **Refocus** — re-center on any star; distances and neighbors recompute automatically
- **Search** — find stars by name or catalog ID (HIP, HD, Gliese, etc.)
- **Hover neighbor lines** — optional lines to the N nearest stars with distance labels
- **Comparison mode** — optional straight drop-lines to show why conventional footprints mislead
- **Display toggles** — labels, Sol highlight, neighbor limits, range filters, camera presets
- **Empires** — group stars into factions with territories, borders, and capitals; export/import campaign data
- **Travel** — plan shortest hop-by-hop routes and simulate how far you can reach within a hop budget

## Empires & travel

These tools are aimed at tabletop campaigns, fiction mapping, and scenario planning on top of the real star catalog.

### Empires

Create named factions and assign star systems to them. Assign stars by selecting one and picking an empire, by **paint mode** (click to assign, shift+click to unassign), or from the focus panel. Each empire has a color, an optional **capital** system, and a list of claimed stars.

Turn on the **political layer** to recolor assigned stars and show:

- **Territory fill** — semi-transparent regions on the chart plane
- **Empire links** — dashed lines between systems in the same faction (optionally on the 2D chart plane or in true 3D)
- **Empire borders** — dashed lines between rival systems within a configurable distance
- **Empire labels** and a map legend

Campaign data (empires and star assignments) is saved automatically in your browser. You can **export** or **import** it as JSON, or **export the chart as SVG** with territories, borders, and any active travel route.

### Travel

**Route planning** — with a focus star and a selected destination, plan the shortest hop-by-hop path through the catalog. Set a **max hop distance** (light-years); only star pairs within that range count as a single jump. The route is drawn on the map with per-leg distances, total travel distance, and straight-line distance for comparison.

**Travel reach** — from the focus system, simulate which stars are reachable within a **max hop distance** and **hop budget** (1–6 hops). Results are grouped by hop count. If you have empires set up, you can claim all unassigned reachable systems to a faction in one step.

Routes and reach calculations use only stars in the loaded catalog.

## Data

Star positions come from the [Fifth Catalogue of Nearby Stars (CNS5)](https://dc.g-vo.org/CNS5) — a volume-complete 25 pc sample based on Gaia astrometry — cross-matched with the [HYG database](https://www.astronexus.com/projects/hyg) (v4.2) for proper names, Bayer/Flamsteed designations, and spectral types. Positions are computed from CNS5 right ascension, declination, and parallax, then converted to light-years.

To regenerate `src/data/stars.json`, download the source files into `scripts/data/`:

1. **CNS5** — either the [CNS5-updated CSV](https://dc.g-vo.org/cns5update/q/cone/form) (preferred) or the [CNS5 `.dat` file](https://cdsarc.cds.unistra.fr/ftp/cats/J/A+A/670/A19/cns5.dat) from CDS
2. **HYG v4.2** — `hyg_v42.csv.gz` from [Codeberg](https://codeberg.org/astronexus/hyg) (Git LFS)

Then run:

```bash
npm run generate-catalog
# or with explicit paths:
npm run generate-catalog -- --cns5 scripts/data/cns5.dat --hyg scripts/data/hyg_v42.csv.gz
```

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Run tests with `npm test`.

## Tech

React, TypeScript, Vite, Three.js ([React Three Fiber](https://github.com/pmndrs/react-three-fiber) + [drei](https://github.com/pmndrs/drei)), Tailwind CSS, Zustand. Projection math lives in `src/math/` with Vitest unit tests. Deployed to GitHub Pages via GitHub Actions.
