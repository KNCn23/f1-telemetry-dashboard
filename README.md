# F1 Telemetry Dashboard

An engineering-focused Formula 1 telemetry visualization tool. Compare driver performances, analyze track maps, and monitor race standings from the browser. Data is sourced via FastF1.

## Features

- **Track Map** — Centered, isometric-scaled with automated braking zone detection
- **Telemetry Lanes** — Scrollable Speed, Gear, Throttle, and RPM traces per driver
- **Race Standings** — Live-style classification display
- **Responsive Layout** — Optimized from 3440px ultrawide to mobile
- **i18n** — English and Turkish localization

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + FastF1 |
| Frontend | Vite (Vanilla JS) + Chart.js |
| Styling | Custom CSS with glassmorphism |

## Local Setup

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## License

MIT
