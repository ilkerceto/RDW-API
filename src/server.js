// src/server.js
const express = require("express");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const API_BASE_URL = "https://rdw-api.vercel.app";


// .env laden
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Optioneel: RDW / Socrata Application Token
const RDW_APP_TOKEN = process.env.RDW_APP_TOKEN || null;

// RDW endpoints
const RDW_VEHICLE_URL = "https://opendata.rdw.nl/resource/m9d7-ebf2.json";
const RDW_FUEL_URL = "https://opendata.rdw.nl/resource/8ys7-d773.json";

// Helper: kenteken opschonen
function normalizePlate(plate) {
  if (!plate) return "";
  return plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Healthcheck
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    endpoints: ["/api/kenteken/:kenteken"]
  });
});

// ---- API ----
app.get("/api/kenteken/:kenteken", async (req, res) => {
  try {
    const rawPlate = req.params.kenteken;
    const plate = normalizePlate(rawPlate);

    if (!plate) {
      return res.status(400).json({
        error: "Ongeldig kenteken",
        detail: "Gebruik een geldig Nederlands kenteken."
      });
    }

    const headers = {};
    if (RDW_APP_TOKEN) {
      headers["X-App-Token"] = RDW_APP_TOKEN;
    }

    const vehicleUrl = `${RDW_VEHICLE_URL}?kenteken=${encodeURIComponent(plate)}`;
    const fuelUrl = `${RDW_FUEL_URL}?kenteken=${encodeURIComponent(plate)}`;

    const [vehRes, fuelRes] = await Promise.all([
      fetch(vehicleUrl, { headers }),
      fetch(fuelUrl, { headers })
    ]);

    if (!vehRes.ok) {
      return res.status(502).json({
        error: "RDW voertuigendpoint faalde",
        status: vehRes.status
      });
    }

    if (!fuelRes.ok) {
      return res.status(502).json({
        error: "RDW brandstofendpoint faalde",
        status: fuelRes.status
      });
    }

    const [vehData, fuelData] = await Promise.all([
      vehRes.json(),
      fuelRes.json()
    ]);

    const voertuig =
      Array.isArray(vehData) && vehData.length > 0 ? vehData[0] : null;

    const brandstoffen = Array.isArray(fuelData) ? fuelData : [];

    if (!voertuig) {
      return res.status(404).json({
        error: "Geen voertuig gevonden",
        kenteken: plate
      });
    }

    // 🔹 Nieuw: chassisnummer uit RDW dataset
    const chassisnummer = voertuig.voertuigidentificatienummer || null;

    return res.json({
      kenteken: plate,
      chassisnummer,   // ⬅️ toegevoegd
      voertuig,
      brandstoffen
    });
  } catch (err) {
    console.error("Interne fout:", err);
    return res.status(500).json({
      error: "Interne serverfout",
      detail: err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`RDW API server luistert op poort ${PORT}`);
});
