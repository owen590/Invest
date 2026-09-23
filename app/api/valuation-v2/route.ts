import { NextResponse } from 'next/server'

const SYMBOLS=['GOOG','META','NVDA','MSFT','AMZN','AAPL','TSLA']
const METRICS=['pe-ratio','pfcf-ratio','ev-ebitda','fcf-yield','ps-ratio','earnings-yield'] as const
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
  const temperature=weight?Math.round(usable.reduce((a,m)=>a+(m.attractiveness as number)*(weights[m.metric]??0),0)/weight):null
  const dispersion=usable.length>1?Math.max(0,100-Math.round(Math.sqrt(usable.reduce((a,m)=>a+Math.pow((m.attractiveness as number)-temperature!,2),0)/usable.length)*1.5)):50
  const quality=temperature==null?null:Math.round(temperature*.7+dispersion*.3)
  const prices=raw[METRICS.length].map(p=>p.value).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0)
  const price=prices.at(-1)??null,high=prices.length?Math.max(...prices):null,low=prices.length?Math.min(...prices):null
  const pricePosition=price!=null&&high!=null&&low!=null&&high>low?Math.round((price-low)/(high-low)*100):null
  const priceAttractiveness=pricePosition==null?null:100-pricePosition
  const valuationScore=temperature==null?null:Math.round((temperature*.50+(quality??temperature)*.25+(priceAttractiveness??50)*.25))
  const valuationState=valuationScore==null?'N/A':valuationScore>=80?'Deep Undervaluation':valuationScore>=65?'Undervalued':valuationScore>=45?'Fair':valuationScore>=30?'Expensive':'Very Expensive'
  const priceState=pricePosition==null?'N/A':pricePosition>=95?'极高位':pricePosition>=85?'高位':pricePosition>=65?'强势区':pricePosition>=40?'中位区':'回撤区'
  return{symbol,ok:metrics.some(m=>m.current!==null),valuationScore,valuationTemperature:temperature,valuationQuality:quality,valuationState,metrics,price,pricePosition,priceAttractiveness,priceState,methodology:'V1.8：估值温度由 P/E 30%、P/FCF 20%、EV/EBITDA 15%、FCF Yield 15%、P/S 10%、Earnings Yield 10% 的历史分位组成；再加入指标一致性质量分；最后用价格位置吸引力修正 Long Call 估值分数。估值与价格位置不再混为单一历史倍数判断。'}
 }))
 return NextResponse.json({source:'TGMCharts',fetchedAt:new Date().toISOString(),methodology:'V1.8 估值温度 + 估值质量 + 价格位置。估值分数用于 Long Call 机会筛选，不代表内在价值。',results})
}