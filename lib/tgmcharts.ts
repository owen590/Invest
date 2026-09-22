export const TGM_BASE = 'https://tgmcharts.com/api/v1'

export type TGMSeriesPoint = { date: string; value: number | null }

export async function getSummary(symbol: string) {
  const response = await fetch(`${TGM_BASE}/summary/${symbol}`, { next: { revalidate: 3600 } })
  if (!response.ok) throw new Error(`TGMCharts summary failed: ${response.status}`)
  return response.json()
}

export async function getSeries(symbol: string, metric: string, years = 5) {
  const response = await fetch(`${TGM_BASE}/series/${symbol}/${metric}?years=${years}`, { next: { revalidate: 3600 } })
  if (!response.ok) throw new Error(`TGMCharts series failed: ${response.status}`)
  return response.json() as Promise<{ points: TGMSeriesPoint[]; methodology?: string; asOf?: unknown }>
}
