# Frontend

React + TypeScript + Vite frontend application for History Explorer.

## Purpose

The frontend provides the user interface and the interactive historical
exploration experience. This directory currently holds only the project
foundation (skeleton) — no complex product features are implemented yet.

## Technology Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite 5
- **Styling:** Plain CSS (Simple CSS)

## Project Structure

```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── index.html
└── src/
    ├── main.tsx          # Application entry point
    ├── App.tsx           # Root component
    ├── App.css           # Global/application styles
    ├── assets/           # Static assets (images, icons, fonts)
    └── components/       # Reusable components (reserved for future use)
```

## Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Planned Components (not yet implemented)

- Timeline components
- Map components
- Relationship visualization
- Exploration interface

## Future Responsibilities

- User interface.
- Historical exploration experience.
- Timeline visualization.
- Map visualization.
- Relationship visualization.

> This directory is under active development. The application currently renders
> only the landing placeholder.
