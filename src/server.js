// src/server.js
const express = require("express");
const dotenv = require("dotenv");
const { getRdwDataForPlate } = require("./rdwClient");

// .env laden
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Optioneel: RDW / Socrata Application Token
const RDW_APP_TOKEN = process.env.RDW_APP_TOKEN || null;

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

    // Alle RDW-calls via de client
    const { vehRes, fuelRes, carrRes, carrSpecRes } =
      await getRdwDataForPlate(plate, headers);

    // Deze twee zijn “kritiek” voor je API
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

    const [vehData, fuelData, carrData, carrSpecData] = await Promise.all([
      vehRes.json(),
      fuelRes.json(),
      carrRes.ok ? carrRes.json() : Promise.resolve([]),
      carrSpecRes.ok ? carrSpecRes.json() : Promise.resolve([])
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

    // Carrosserie-datasets (optioneel)
    const carrosserieRow =
      Array.isArray(carrData) && carrData.length > 0 ? carrData[0] : null;

    const carrosserieSpecRow =
      Array.isArray(carrSpecData) && carrSpecData.length > 0
        ? carrSpecData[0]
        : null;

    // 🔹 chassisnummer uit RDW dataset
    const chassisnummer = voertuig.voertuigidentificatienummer || null;

    return res.json({
      kenteken: plate,
      chassisnummer,
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
