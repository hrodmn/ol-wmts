import Map from "ol/Map.js";

import OSM from "ol/source/OSM.js";
import TileLayer from "ol/layer/WebGLTile.js";
import View from "ol/View.js";

import WMTS, { optionsFromCapabilities } from "ol/source/WMTS.js";
import WMTSCapabilities from "ol/format/WMTSCapabilities.js";

const parser = new WMTSCapabilities();

// Available time values from the WMTS capabilities
const availableTimes = [
  "2024-01-01",
  "2024-01-17",
  "2024-02-02",
  "2024-02-18",
  "2024-03-05",
  "2024-03-21",
  "2024-04-06",
  "2024-04-22",
  "2024-05-08",
  "2024-05-24",
  "2024-06-09",
  "2024-06-25",
  "2024-07-11",
  "2024-07-27",
  "2024-08-12",
  "2024-08-28",
  "2024-09-13",
  "2024-09-29",
  "2024-10-15",
  "2024-10-31",
  "2024-11-16",
  "2024-12-02",
  "2024-12-18",
  "2025-01-01",
  "2025-01-17",
  "2025-02-02",
  "2025-02-18",
  "2025-03-06",
  "2025-03-22",
  "2025-04-07",
];

async function initializeMap() {
  const response = await fetch(
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?service=wmts&request=GetCapabilities",
  );
  const text = await response.text();
  const wmsCapabilities = parser.read(text);
  const options = optionsFromCapabilities(wmsCapabilities, {
    layer: "MODIS_Terra_L3_NDVI_16Day",
  });
  console.log("urls:", options.urls);
  options.urls = [
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_NDVI_16Day/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  ];

  const wmtsSource = new WMTS(options);

  new Map({
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
      new TileLayer({
        opacity: 0.7,
        source: wmtsSource,
      }),
    ],
    target: "map",
    view: new View({
      center: [0, 0],
      zoom: 0,
    }),
  });

  function populateDateDropdown() {
    const dropdown = document.getElementById("date-dropdown");

    dropdown.innerHTML = '<option value="">Select a date...</option>';

    const sortedDates = [...availableTimes].sort(
      (a, b) => new Date(b) - new Date(a),
    );

    sortedDates.forEach((dateValue) => {
      const option = document.createElement("option");
      option.value = dateValue;
      option.textContent = dateValue;
      dropdown.appendChild(option);
    });
  }

  populateDateDropdown();

  const dropdown = document.getElementById("date-dropdown");
  const updateSourceDimension = function () {
    wmtsSource.updateDimensions({ Time: dropdown.value });
  };
  dropdown.addEventListener("input", updateSourceDimension);
  updateSourceDimension();
}

initializeMap();
