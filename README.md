# Pokemon Explorer

## A. Project Description

Pokemon Explorer is a creative Pokemon discovery application built with Next.js, React, TanStack Query, Tailwind CSS, and the public [PokeAPI](https://pokeapi.co/).

The application lets users browse Pokemon with pagination, search and filter by type, view detailed Pokemon profiles, inspect stats and evolution chains, build a six-member team, analyze type effectiveness, and run a dedicated Pokemon battle simulator.

Key features include:

- Paginated Pokemon list with search and type filters
- Pokemon detail page with stats, abilities, moves, flavor text, and evolution chain
- Stat radar visualization for quick profile comparison
- Team builder with defensive pressure, shared weakness, and STAB coverage analysis
- Dedicated battle simulator page with matchup forecasting, HP meters, and turn-by-turn logs
- Shared header and footer layout across the application

## B. Setup/Installation Instructions

Make sure you have Node.js installed. This project uses npm for dependency management.

1. Clone the repository:

```bash
git clone <repository-url>
cd pokemon-explorer
```

2. Install dependencies:

```bash
npm install
```

3. Confirm the project builds correctly:

```bash
npm run build
```

## C. How To Run The Application

Start the local development server:

```bash
npm run dev
```

Then open the app in your browser:

```bash
http://localhost:3000
```

Useful routes:

- `/` - Pokemon explorer, search, filters, pagination, and team builder
- `/pokemon/[name]` - Pokemon detail page, for example `/pokemon/pikachu`
- `/battle` - Dedicated Pokemon battle simulator

## D. Demo Link

Demo link: `https://pokemon-explorer-omega-eight.vercel.app/`

## E. Challenges Faced And Solutions

One challenge was balancing PokeAPI data fetching with a smooth user experience. The app solves this by using TanStack Query for caching, stale times, and parallel requests for Pokemon cards, type data, and team members.

Another challenge was making type effectiveness readable. Instead of showing raw API relationships, the app converts type data into defensive pressure, shared weaknesses, immunities, resistances, and offensive STAB coverage.

The battle simulator was also simplified intentionally. Pokemon battle mechanics can be very deep, so the simulator uses a deterministic forecast model based on HP, attack/defense stats, speed, STAB, battle pace, and type effectiveness. This keeps the feature understandable while still being useful for matchup planning.

Finally, the Pokemon list originally used infinite loading, but pagination was added to make browsing more predictable and easier to navigate during search and filtering.
