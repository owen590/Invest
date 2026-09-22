import { NextResponse } from 'next/server'

const SYMBOLS = ['GOOG','META','NVDA','MSFT','AMZN','AAPL','TSLA']
const METRICS = ['pe-ratio','pfcf-ratio','ev-ebitda','fcf-yield'] as const

type Point = { date:string; value:number|null }
function median(values:number[]){ if(!values.length)return null; const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2 }
function percentile(values:number[],value:number){ if(values.length<2)return null; let below=0; for(const v of values)if(v<value)below++; return Math.round(below/(values.length-1)*100) }
async function getSeries(symbol:string,metric:string){ try{const r=await fetch(`https://tgmcharts.com/api/v1/series/${symbol}/${metric}?years=5`,{next:{revalidate:3600}});if(!r.ok)return[] as Point[];const j=await r.json();return(j.points??[]) as Point[]}catch{return[] as Point[]}}
export async function GET(){
 const results=await Promise.all(SYMBOLS.map(async symbol=>{
  const raw=await Promise.all(METRICS.map(m=>getSeries(symbol,m)))
  const metrics=METRICS.map((metric,i)=>{const values=raw[i].map(p=>p.value).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0);const current=values.at(-1)??null;const med=median(values);const pct=current==null?null:percentile(values,current);let attractiveness:null|number=null;if(current!=null&&med!=null){const ratio=metric==='fcf-yield'?current/med:med/current;attractiveness=Math.max(0,Math.min(100,Math.round(50+(ratio-1)*100)))}return{metric,current,median5y:med,percentile5y:pct,attractiveness,points:raw[i].length}})
  const usable=metrics.map(m=>m.attractiveness).filter((x):x is number=>x!==null);const valuationScore=usable.length?Math.round(usable.reduce((a,b)=>a+b,0)/usable.length):null
  const valuationState=valuationScore===null?'N/A':valuationScore>=80?'Deep Undervaluation':valuationScore>=65?'Undervalued':valuationScore>=45?'Fair':valuationScore>=30?'Expensive':'Very Expensive'
  return{symbol,ok:metrics.some(m=>m.current!==null),valuationScore,valuationState,metrics}
 }))
 return NextResponse.json({source:'TGMCharts',fetchedAt:new Date().toISOString(),methodology:'Five-year historical median and percentile. P/E, P/FCF and EV/EBITDA reward lower multiples; FCF Yield rewards higher yields. This is a relative valuation screen, not intrinsic value.',results})
}