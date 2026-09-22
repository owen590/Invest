import { NextResponse } from 'next/server'

// Data adapter: keep external market-data access server-side so keys/providers
// can be changed without touching the UI. This endpoint currently uses Yahoo's
// public chart endpoint as a prototype fallback; replace with a licensed feed
// when the app is used beyond personal research.
const SYMBOLS = ['GOOG','META','NVDA','MSFT','AMZN','AAPL']

export async function GET() {
  const results = await Promise.all(SYMBOLS.map(async (symbol) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`
      const response = await fetch(url, { next: { revalidate: 900 } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const json = await response.json()
      const result = json.chart?.result?.[0]
      const meta = result?.meta
      const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((x: unknown): x is number => typeof x === 'number')
      const price = meta?.regularMarketPrice ?? closes.at(-1) ?? null
      const sma = (n:number) => closes.length >= n ? closes.slice(-n).reduce((a:number,b:number)=>a+b,0)/n : null
      const high52 = closes.length ? Math.max(...closes) : null
      return { symbol, price, sma20:sma(20), sma50:sma(50), sma200:sma(200), high52, drawdown: high52 && price ? (price/high52-1)*100 : null, source:'Yahoo chart prototype' }
    } catch {
      return { symbol, price:null, sma20:null, sma50:null, sma200:null, high52:null, drawdown:null, source:'unavailable' }
    }
  }))
  return NextResponse.json({ updatedAt:new Date().toISOString(), results })
}
