import Map from "ol/Map.js";

import OSM from "ol/source/OSM.js";
import TileLayer from "ol/layer/WebGLTile.js";
import View from "ol/View.js";

import WMTS, { optionsFromCapabilities } from "ol/source/WMTS.js";
import WMTSCapabilities from "ol/format/WMTSCapabilities.js";

const parser = new WMTSCapabilities();

function parseDurationToDays(duration) {
  const match = duration.match(/P(\d+)D/);
  return match ? parseInt(match[1], 10) : 1;
}

function generateDatesFromInterval(intervalString) {
  const parts = intervalString.split("/");
  if (parts.length !== 3) {
    return [intervalString];
  }

  const [startDate, endDate, duration] = parts;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const intervalDays = parseDurationToDays(duration);

  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + intervalDays);
  }

  return dates;
}

function parseTimeDimensionFromCapabilities(capabilities, layerName) {
  const contents = capabilities.Contents;
  if (!contents || !contents.Layer) {
    return [];
  }

  const layer = contents.Layer.find((l) => l.Identifier === layerName);
  if (!layer || !layer.Dimension) {
    return [];
  }

  const timeDimension = layer.Dimension.find((d) => d.Identifier === "Time");
  if (!timeDimension || !timeDimension.Value) {
    return [];
  }

  const timeValues = Array.isArray(timeDimension.Value)
    ? timeDimension.Value
    : [timeDimension.Value];

  const allDates = [];
  timeValues.forEach((value) => {
    const trimmedValue = value.trim();
    if (trimmedValue.includes("/")) {
      allDates.push(...generateDatesFromInterval(trimmedValue));
    } else {
      allDates.push(trimmedValue);
    }
  });

  return [...new Set(allDates)].sort();
}

async function initializeMap() {
  const response = await fetch(
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?service=wmts&request=GetCapabilities",
  );
  const text = await response.text();
  const wmsCapabilities = parser.read(text);
  const layerName = "MODIS_Terra_L3_NDVI_16Day";
  const options = optionsFromCapabilities(wmsCapabilities, {
    layer: layerName,
  });
  console.log("urls:", options.urls);
  options.urls = [
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_NDVI_16Day/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  ];

  const availableTimes = parseTimeDimensionFromCapabilities(
    wmsCapabilities,
    layerName,
  );
  console.log("Available times from capabilities:", availableTimes);

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

  function populateDateDropdown(times) {
    const dropdown = document.getElementById("date-dropdown");

    dropdown.innerHTML = '<option value="">Select a date...</option>';

    const sortedDates = [...times].sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach((dateValue) => {
      const option = document.createElement("option");
      option.value = dateValue;
      option.textContent = dateValue;
      dropdown.appendChild(option);
    });
  }

  populateDateDropdown(availableTimes);

  const dropdown = document.getElementById("date-dropdown");
  const updateSourceDimension = function () {
    wmtsSource.updateDimensions({ Time: dropdown.value });
  };
  dropdown.addEventListener("input", updateSourceDimension);
  updateSourceDimension();
}

initializeMap();
