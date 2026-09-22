import { NextResponse } from 'next/server'

const symbols = ['GOOG','META','NVDA','MSFT','AMZN','AAPL','TSLA']

export async function GET() {
  const results = await Promise.all(symbols.map(async symbol => {
    const res = await fetch(`https://tgmcharts.com/api/v1/summary/${symbol}`, { next: { revalidate: 3600 } })
    if (!res.ok) return { symbol, ok: false }
    const data = await res.json()
    return { symbol, ok: true, data }
  }))
  return NextResponse.json({ source: 'TGMCharts', fetchedAt: new Date().toISOString(), results })
}
