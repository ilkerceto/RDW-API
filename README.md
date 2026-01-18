# RDW Kenteken API

Eenvoudige Node.js API die de **RDW Open Data** gebruikt om voertuig- en brandstofgegevens op te halen
op basis van een kenteken.

## Functionaliteit

- Endpoint: `GET /api/kenteken/:kenteken`
- Haalt data op uit:
  - `Gekentekende_voertuigen` (basis voertuigdata)
  - `Gekentekende_voertuigen_brandstof` (brandstofgegevens)
- Maakt het kenteken-formaat schoon (streepjes/spaties verwijderd, uppercase)
- Retourneert JSON zoals:

```json
{
  "kenteken": "1ABC23",
  "voertuig": { "...": "..." },
  "brandstoffen": [
    { "...": "..." }
  ]
}
```
## Installatie

- git clone https://github.com/ilkerceto/rdw-api.git
- cd rdw-kenteken-api
- npm install
- Maak vervolgens een **.env** bestand op basis van **.env.example** --> cp .env.example .env
- Bewerk het **.env** bestand (indien nodig):
- PORT=3000
- RDW_APP_TOKEN=JOUW_RDW_APP_TOKEN_HIER

## Server opstarten

- Development: npm run dev
- Production: npm start
- **De API draait nu op http://localhost:3000**
