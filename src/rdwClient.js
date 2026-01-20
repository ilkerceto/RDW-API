// src/rdwClient.js
const fetch = require("node-fetch");

const RDW_VEHICLE_URL = "https://opendata.rdw.nl/resource/m9d7-ebf2.json";
const RDW_FUEL_URL = "https://opendata.rdw.nl/resource/8ys7-d773.json";
const RDW_CARROSSERIE_URL = "https://opendata.rdw.nl/resource/vezc-m2t6.json";
const RDW_CARROSSERIE_SPEC_URL = "https://opendata.rdw.nl/resource/jhie-znh9.json";

async function getRdwDataForPlate(plate, headers = {}) {
  const vehicleUrl = `${RDW_VEHICLE_URL}?kenteken=${encodeURIComponent(plate)}`;
  const fuelUrl = `${RDW_FUEL_URL}?kenteken=${encodeURIComponent(plate)}`;
  const carrosserieUrl = `${RDW_CARROSSERIE_URL}?kenteken=${encodeURIComponent(plate)}`;
  const carrosserieSpecUrl = `${RDW_CARROSSERIE_SPEC_URL}?kenteken=${encodeURIComponent(plate)}`;

  const [vehRes, fuelRes, carrRes, carrSpecRes] = await Promise.all([
    fetch(vehicleUrl, { headers }),
    fetch(fuelUrl, { headers }),
    fetch(carrosserieUrl, { headers }),
    fetch(carrosserieSpecUrl, { headers })
  ]);

  return {
    vehRes,
    fuelRes,
    carrRes,
    carrSpecRes
  };
}

module.exports = { getRdwDataForPlate };
