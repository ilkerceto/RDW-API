// src/server.js
const express = require("express");
const fetch = require("node-fetch");
const dotenv = require("dotenv");

// .env laden
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Optioneel: Application Token van RDW / Socrata voor hogere limieten
const RDW_APP_TOKEN = process.env.RDW_APP_TOKEN || null;

// RDW endpoints
const RDW_VEHICLE_URL = "https://opendata.rdw.nl/resource/m9d7-ebf2.json";
const RDW_FUEL_URL = "https://opendata.rdw.nl/resource/8ys7-d773.json";

// Helper: kenteken opschonen (streepjes/spaties weg, uppercase)
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

/**
 * Healthcheck / root
 */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "RDW Kenteken API draait",
    endpoints: [
      "/api/kenteken/:kenteken"
    ]
  });
});

/**
 * GET /api/kenteken/:kenteken
 *
 * Voorbeeld:
 *   GET /api/kenteken/1-ABC-23
 *   GET /api/kenteken/1abc23
 */
app.get("/api/kenteken/:kenteken", async (req, res) => {
  try {
    const rawPlate = req.params.kenteken;
    const plate = normalizePlate(rawPlate);

    if (!plate) {
      return res.status(400).json({
        error: "Ongeldig kenteken",
        detail: "Geef een geldig Nederlands kenteken op (letters/cijfers)."
      });
    }

    // URLs opbouwen
    const vehicleUrl = `${RDW_VEHICLE_URL}?kenteken=${encodeURIComponent(
      plate
    )}`;
    const fuelUrl = `${RDW_FUEL_URL}?kenteken=${encodeURIComponent(plate)}`;

    const headers = {};
    if (RDW_APP_TOKEN) {
      headers["X-App-Token"] = RDW_APP_TOKEN;
    }

    // Tegelijk RDW aanroepen
    const [vehRes, fuelRes] = await Promise.all([
      fetch(vehicleUrl, { headers }),
      fetch(fuelUrl, { headers })
    ]);

    if (!vehRes.ok) {
      const text = await vehRes.text().catch(() => "");
      console.error("RDW voertuig error:", vehRes.status, text);
      return res.status(502).json({
        error: "RDW voertuigendpoint faalde",
        status: vehRes.status
      });
    }

    if (!fuelRes.ok) {
      const text = await fuelRes.text().catch(() => "");
      console.error("RDW brandstof error:", fuelRes.status, text);
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

    // Hier zou je eventueel velden kunnen mappen/vertalen
    // bijv. merk -> Merk, handelsbenaming -> Model, etc.

    return res.json({
      kenteken: plate,
      voertuig,
      brandstoffen
    });
  } catch (err) {
    console.error("Interne fout:", err);
    return res.status(500).json({
      error: "Interne serverfout",
      detail: "Er ging iets mis bij het ophalen van de RDW-gegevens."
    });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`RDW API server luistert op poort ${PORT}`);
});
