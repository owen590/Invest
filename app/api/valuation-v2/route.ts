import { NextResponse } from 'next/server'

const SYMBOLS = ['GOOG','META','NVDA','MSFT','AMZN','AAPL','TSLA']
const METRICS = ['pe-ratio','pfcf-ratio','ev-ebitda','fcf-yield','ps-ratio','earnings-yield'] as const

type Point={date:string;value:number|null}
function percentile(values:number[],value:number){if(values.length<2)return null;let below=0;for(const v of values)if(v<value)below++;return Math.round(below/(values.length-1)*100)}
function attractiveness(metric:string,pct:number|null){if(pct==null)return null;return metric.endsWith('yield')?pct:100-pct}
async function getSeries(symbol:string,metric:string,years=5){try{const r=await fetch(`https://tgmcharts.com/api/v1/series/${symbol}/${metric}?years=${years}`,{next:{revalidate:3600}});if(!r.ok)return[] as Point[];const j=await r.json();return(j.points??[]) as Point[]}catch{return[] as Point[]}}
export async function GET(){
 const results=await Promise.all(SYMBOLS.map(async symbol=>{
  const raw=await Promise.all([...METRICS,'price'].map(m=>getSeries(symbol,m,m==='price'?1:5)))
  const metrics=METRICS.map((metric,i)=>{const values=raw[i].map(p=>p.value).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0);const current=values.at(-1)??null;const pct=current==null?null:percentile(values,current);return{metric,current,percentile5y:pct,attractiveness:attractiveness(metric,pct),points:values.length}})
  const weights:Record<string,number>={'pe-ratio':.30,'pfcf-ratio':.20,'ev-ebitda':.15,'fcf-yield':.15,'ps-ratio':.10,'earnings-yield':.10}
  const usable=metrics.filter(m=>m.attractiveness!==null),weight=usable.reduce((a,m)=>a+(weights[m.metric]??0),0)
  const valuationScore=weight?Math.round(usable.reduce((a,m)=>a+(m.attractiveness as number)*(weights[m.metric]??0),0)/weight):null
  const prices=raw[METRICS.length].map(p=>p.value).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0),price=prices.at(-1)??null,high=prices.length?Math.max(...prices):null,low=prices.length?Math.min(...prices):null
  const pricePosition=price!=null&&high!=null&&low!=null&&high>low?Math.round((price-low)/(high-low)*100):null
  const priceAttractiveness=pricePosition==null?null:100-pricePosition
  const valuationState=valuationScore==null?'暂无数据':valuationScore>=80?'低估':valuationScore>=65?'偏低':valuationScore>=45?'合理':valuationScore>=30?'偏高':'高估'
  const priceState=pricePosition==null?'暂无数据':pricePosition>=95?'极高位':pricePosition>=85?'高位':pricePosition>=65?'强势区':pricePosition>=40?'中位区':'回撤区'
  const quality=valuationScore==null?null:Math.min(100,Math.round(valuationScore*.7+(usable.length>=4?20:10)+(metrics.some(m=>m.metric==='fcf-yield'&&(m.attractiveness??0)>=60)?10:0)))
  return{symbol,ok:metrics.some(m=>m.current!==null),valuationScore,valuationState,metrics,price,pricePosition,priceAttractiveness,priceState,valuationQuality:quality,methodology:'V1.8：估值温度 = P/E 30% + P/FCF 20% + EV/EBITDA 15% + FCF Yield 15% + P/S 10% + Earnings Yield 10%。估值与价格位置分开计算。'}
 }))
 return NextResponse.json({source:'TGMCharts',fetchedAt:new Date().toISOString(),methodology:'V1.8 估值温度 + 价格位置。历史分位用于相对估值筛选，不等同于内在价值。',results})
}