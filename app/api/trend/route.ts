import { NextResponse } from 'next/server'

const SYMBOLS = ['GOOG','META','NVDA','MSFT','AMZN','AAPL','TSLA']

type Point = { date:string; value:number|null }

function avg(values:number[]){
  return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null
}
function sma(values:number[], n:number){
  return values.length >= n ? avg(values.slice(-n)) : null
}
function slope(values:number[], n:number){
  if(values.length < n*2) return null
  const a=avg(values.slice(-n*2,-n))
  const b=avg(values.slice(-n))
  return a && b ? ((b/a)-1)*100 : null
}
function pct(a:number|null,b:number|null){
  return a!=null&&b ? ((a/b)-1)*100 : null
}

async function getSeries(symbol:string){
  try{
    const r=await fetch(`https://tgmcharts.com/api/v1/series/${symbol}/total-return?years=2`,{next:{revalidate:3600}})
    if(!r.ok)return [] as Point[]
    const j=await r.json()
    return (j.points??[]) as Point[]
  }catch{return [] as Point[]}
}

function analyze(symbol:string, raw:Point[]){
  const points=raw.filter(p=>typeof p.value==='number'&&Number.isFinite(p.value)).map(p=>({date:p.date,value:p.value as number}))
  const values=points.map(p=>p.value)
  const price=values.at(-1)??null
  const ma20=sma(values,20), ma50=sma(values,50), ma200=sma(values,200)
  const s20=slope(values,20), s50=slope(values,50)
  const high252=values.length?Math.max(...values.slice(-252)):null
  const low252=values.length?Math.min(...values.slice(-252)):null
  const drawdown=pct(price,high252)

  let state='N/A'
  let score:number|null=null
  if(price!=null&&ma20!=null&&ma50!=null){
    const bullish=price>ma20&&ma20>ma50&&(s20??0)>0
    const strong=bullish&&ma50!=null&&ma200!=null&&ma50>ma200&&(s50??0)>0
    const repair=price>ma20&&ma20>ma50&&(s20??0)>0
    const reclaim=price>ma20&&((s20??0)>0)
    const bearish=price<ma50&&(s50??0)<0
    if(strong){state='Bullish Trend';score=90}
    else if(bullish){state='Trend Confirmed';score=78}
    else if(repair){state='Trend Repairing';score=65}
    else if(reclaim){state='Early Repair';score=55}
    else if(bearish){state='Downtrend';score=25}
    else{state='Mixed / Wait';score=45}
  }
  return {symbol,ok:price!=null,asOf:points.at(-1)?.date??null,price,ma20,ma50,ma200,slope20:s20,slope50:s50,high252,low252,drawdown,state,score,points:points.length}
}

export async function GET(){
  const results=await Promise.all(SYMBOLS.map(async symbol=>analyze(symbol,await getSeries(symbol))))
  return NextResponse.json({
    source:'TGMCharts',
    fetchedAt:new Date().toISOString(),
    methodology:'Trend is calculated from the daily total-return series using MA20/MA50/MA200, moving-average slope and 252-day drawdown. Trend state is descriptive, not a forecast.',
    results
  })
}
