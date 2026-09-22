# MAGS Long Call Radar

A personal decision-support dashboard for MAGS Long Call research.

## V1
- MAGS watchlist: GOOG, META, NVDA, MSFT, AMZN, AAPL
- TSLA excluded by the current strategy rule
- Valuation / fundamentals / narrative re-rating / trend / IV / Call quality framework
- Major Re-rating vs Ordinary Opportunity classification
- Simple option position-budget calculator
- SocialWatcher market-valuation data adapter reserved for the next iteration

> Current scores in the UI are strategy-framework placeholders, not live market data.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy

The app is designed for Vercel + GitHub deployment.
