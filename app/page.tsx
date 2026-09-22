'use client'
import { useEffect, useMemo, useState } from 'react'

type Stock={ticker:string;name:string;fundamental:number;narrative:number;trend:number;iv:number;call:number;mode:string;note:string}
const APP_VERSION='V1.6'
const base:Stock[]=[
{ticker:'GOOG',name:'Alphabet',fundamental:94,narrative:92,trend:78,iv:76,call:88,mode:'Major Re-rating',note:'重点观察 AI / Search / Cloud 带来的预期与估值重估。'},
{ticker:'META',name:'Meta Platforms',fundamental:93,narrative:88,trend:84,iv:72,call:87,mode:'Major Re-rating',note:'盈利能力强，重点观察估值与未来盈利预期的匹配。'},
{ticker:'NVDA',name:'NVIDIA',fundamental:96,narrative:90,trend:82,iv:68,call:84,mode:'Ordinary opportunity',note:'基本面强，但必须坚持估值纪律。'},
{ticker:'MSFT',name:'Microsoft',fundamental:95,narrative:84,trend:76,iv:79,call:81,mode:'Ordinary opportunity',note:'高质量复利型公司，等待有安全边际的入场点。'},
{ticker:'AMZN',name:'Amazon',fundamental:88,narrative:81,trend:73,iv:75,call:80,mode:'Ordinary opportunity',note:'关注 AWS 与利润率改善，趋势确认后再提高仓位。'},
{ticker:'AAPL',name:'Apple',fundamental:86,narrative:70,trend:69,iv:83,call:73,mode:'Ordinary opportunity',note:'估值需要进一步进入你的低估区才值得做 Call。'},
{ticker:'TSLA',name:'Tesla',fundamental:70,narrative:68,trend:65,iv:60,call:0,mode:'Pass',note:'按你的策略规则暂时排除：估值严重偏高。'}]
function getEntryState(valuationState:string|undefined,trendState:string|undefined,mode:string){
 if(mode==='Pass')return {label:'PASS',tone:'gray',reason:'模式外 / 黑名单'}
 const cheap=valuationState==='Deep Undervaluation'||valuationState==='Undervalued'
 const fair=valuationState==='Fair'
 const confirmed=trendState==='Bullish Trend'||trendState==='Trend Confirmed'
 const repairing=trendState==='Trend Repairing'||trendState==='Early Repair'
 if(cheap&&confirmed)return {label:'CONFIRMED',tone:'green',reason:'低估 + 趋势确认'}
 if(cheap&&repairing)return {label:'SETUP',tone:'yellow',reason:'低估 + 趋势修复，等待确认'}
 if(cheap)return {label:'WATCH',tone:'yellow',reason:'低估，但趋势尚未确认'}
 if(fair&&confirmed)return {label:'WATCH',tone:'yellow',reason:'估值中性，趋势已确认'}
 return {label:'WAIT',tone:'gray',reason:'估值或趋势不满足'}
}
export default function Home(){
 const[selected,setSelected]=useState('GOOG'),[data,setData]=useState<Record<string,any>>({}),[trend,setTrend]=useState<Record<string,any>>({}),[premium,setPremium]=useState(''),[budget,setBudget]=useState('800'),[account,setAccount]=useState('11500'),[entryPrice,setEntryPrice]=useState('5.5'),[currentPrice,setCurrentPrice]=useState(''),[dte,setDte]=useState('120'),[delta,setDelta]=useState('0.70'),[theta,setTheta]=useState('0.03')
 useEffect(()=>{fetch('/api/valuation-v2').then(r=>r.json()).then(x=>{const m:Record<string,any>={};x.results?.forEach((r:any)=>{if(r.ok)m[r.symbol]=r});setData(m)});fetch('/api/trend').then(r=>r.json()).then(x=>{const m:Record<string,any>={};x.results?.forEach((r:any)=>{if(r.ok)m[r.symbol]=r});setTrend(m)})},[])
 const stock=useMemo(()=>{const s=base.find(x=>x.ticker===selected)!;const d=data[selected];const t=trend[selected];const v=d?.valuationScore;const trendScore=t?.score??s.trend;const total=v==null?null:Math.round(v*.30+s.fundamental*.20+s.narrative*.15+trendScore*.20+s.iv*.05+s.call*.10);const entry=getEntryState(d?.valuationState,t?.state,s.mode);const maxRisk=Number(account)*.25;const modeFactor=s.mode==='Major Re-rating'?1:s.mode==='Ordinary opportunity'?.6:0;const suggestedRisk=entry.label==='CONFIRMED'?Math.round(maxRisk*modeFactor):entry.label==='SETUP'?Math.round(maxRisk*modeFactor*.5):0;return{...s,trend:trendScore,trendState:t?.state,valuation:v,total,valuationState:d?.valuationState,metrics:d?.metrics??[],trendData:t,entry,suggestedRisk,maxRisk}},[selected,data])
 const contracts=Number(premium)>0?Math.floor(Number(budget)/(Number(premium)*100)):0
 const exit=useMemo(()=>{
  const ep=Number(entryPrice),cp=Number(currentPrice),days=Number(dte),d=Number(delta),th=Number(theta)
  if(!(ep>0&&cp>0)) return {state:'INPUT',tone:'gray',gain:null,action:'输入当前 Call 价格后计算',reason:'退出引擎需要成本价与当前期权价格'}
  const gain=(cp/ep-1)*100, major=base.find(x=>x.ticker===selected)?.mode==='Major Re-rating'
  const ts=trend[selected]?.state??'', broken=ts==='Downtrend', weak=ts==='Mixed / Wait'||ts==='Early Repair'
  let state='HOLD',tone='green',action='继续持有',reason='趋势未破坏，暂不因盈利幅度机械卖出'
  if(broken){state='EXIT';tone='red';action='退出或大幅减仓';reason='趋势状态转为 Downtrend，优先保护剩余权利金'}
  else if(days<=21){state='TRIM';tone='yellow';action='减仓 / 换到更远 DTE';reason='DTE 过低，Theta 与 Gamma 风险明显上升'}
  else if(major&&gain>=100&&!weak){state='TRIM';tone='yellow';action='分批兑现 30–50%，保留核心仓';reason='重大重估已产生大幅利润，但趋势仍完整，避免再次卖飞'}
  else if(!major&&gain>=60){state='TRIM';tone='yellow';action='分批兑现 30–50%';reason='普通机会达到机械止盈区，降低盈利回撤'}
  else if(weak&&gain>0){state='TRIM';tone='yellow';action='减仓 25–50%';reason='趋势转弱，先锁定部分利润'}
  else if(d>0&&d<0.50&&gain>50){state='ROLL';tone='yellow';action='考虑换更高 Delta / 更远 DTE';reason='Delta 偏低且已有利润，避免继续持有低效率合约'}
  return {state,tone,gain,action,reason,days,d,th}
 },[entryPrice,currentPrice,dte,delta,theta,selected,trend])
 const fmt=(v:any)=>typeof v==='number'?v.toFixed(1):'—'
 return <main><header><div><span className="eyebrow">INVEST / MAGS LONG CALL</span><h1>MAGS Radar</h1><p>低估 → 趋势确认 → Long Call。估值使用 TGMCharts 五年历史数据。</p></div><div className="badge">V1.6 · Entry + Exit Engine</div></header>
 <section className="grid">{base.map(s=>{const d=data[s.ticker],t=trend[s.ticker];return <button key={s.ticker} onClick={()=>setSelected(s.ticker)} className={'card '+(selected===s.ticker?'active':'')}><div className="row"><b>{s.ticker}</b><span className={'state '+(s.mode==='Major Re-rating'?'green':s.mode==='Pass'?'gray':'yellow')}>{s.mode}</span></div><strong>{t?.state??'Trend …'}</strong><small>{s.name}</small></button>})}</section>
 <section className="detail"><div className="panel hero"><div className="row"><div><span className="ticker">{stock.ticker}</span><h2>{stock.name}</h2></div><div className="scoreWrap"><span className={'signal '+(stock.entry?.tone??'gray')}>{stock.entry?.label??'WAIT'}</span><span className="score">{stock.total??'—'}</span></div></div><p className="signalReason">{stock.entry?.reason??'等待数据'}</p><p>{stock.note}</p><div className="valuationBox"><div><span>Valuation State</span><b>{stock.valuationState??'Loading…'}</b></div><div className="valuationScoreLine"><span>Relative score</span><strong>{stock.valuation??'—'}</strong></div><small>基于 5Y 历史中位数/分位：P/E、P/FCF、EV/EBITDA、FCF Yield</small><div className="trendBox"><div><span>Trend State</span><b>{stock.trendState??'Loading…'}</b></div><div className="trendGrid"><span>MA20 {fmt(stock.trendData?.ma20)}</span><span>MA50 {fmt(stock.trendData?.ma50)}</span><span>MA200 {fmt(stock.trendData?.ma200)}</span><span>52W DD {stock.trendData?.drawdown==null?'—':fmt(stock.trendData.drawdown)+'%'}</span></div></div><div className="metricTable">{stock.metrics.map((m:any)=><div className="metricRow" key={m.metric}><span>{m.metric}</span><span>{m.current==null?'N/A':fmt(m.current)} / {m.median5y==null?'—':fmt(m.median5y)}</span><span>{m.percentile5y==null?'—':m.percentile5y+'%'}</span></div>)}</div></div><div className="meters">{([['Valuation',stock.valuation],['Fundamental',stock.fundamental],['Narrative',stock.narrative],['Trend',stock.trend],['IV',stock.iv],['Call',stock.call]] as [string,number|null|undefined][]).map(([label,v])=><div key={label}><div className="row"><span>{label}</span><b>{v??'N/A'}</b></div><div className="bar"><i style={{width:`${v??0}%`}}/></div></div>)}</div></div>
 <div className="panel"><h3>Exit Engine · V1.6</h3><p className="muted">核心目标：解决“判断对趋势，却卖飞”。Major Re-rating 不因固定盈利百分比清仓，而是分批兑现 + 趋势保护 + DTE / Delta 风控。</p><div className="exitGrid"><label>Call 成本<input value={entryPrice} onChange={e=>setEntryPrice(e.target.value)}/></label><label>当前 Call 价格<input value={currentPrice} onChange={e=>setCurrentPrice(e.target.value)} placeholder="例如 12.0"/></label><label>DTE<input value={dte} onChange={e=>setDte(e.target.value)}/></label><label>Delta<input value={delta} onChange={e=>setDelta(e.target.value)}/></label><label>Theta / 天<input value={theta} onChange={e=>setTheta(e.target.value)}/></label></div><div className={'exitSignal '+(exit.tone??'gray')}><div><span>Exit State</span><b>{exit.state}</b></div><strong>{exit.gain==null?'—':exit.gain.toFixed(0)+'%'}</strong></div><div className="riskLine"><span>建议动作</span><b>{exit.action}</b></div><p className="signalReason">{exit.reason}</p><hr/><h3>Risk & Call Calculator</h3><label>账户规模<input value={account} onChange={e=>setAccount(e.target.value)}/></label><div className="riskLine"><span>Long Call 25%总风险上限</span><b>${stock.maxRisk?.toLocaleString()}</b></div><div className="riskLine"><span>当前机会建议风险预算</span><b>${stock.suggestedRisk?.toLocaleString()}</b></div><label>Call价格 / contract<input value={premium} onChange={e=>setPremium(e.target.value)} placeholder="例如 5.50"/></label><label>风险预算<input value={budget} onChange={e=>setBudget(e.target.value)}/></label><div className="calc"><span>最大合约数</span><b>{contracts||'—'}</b></div><p className="muted">每张期权按 ×100 股计算。Major Re-rating 使用更高风险预算；普通机会约 60%；Pass 不分配风险预算。这里是规则计算器，不是自动下单。</p></div></section>
 <section className="rules"><h2>交易框架</h2><div className="rulegrid"><article><b>Exit Engine V1.6</b><p>Major Re-rating：+100% 后优先兑现 30–50%，剩余核心仓跟随趋势；普通机会 +60% 进入分批止盈；趋势破坏优先于利润目标。</p></article><article><b>估值</b><p>低估才进入候选；跌得多不等于低估。估值优先看五年历史中位数与分位。</p></article><article><b>趋势</b><p>估值决定有没有资格买，趋势决定什么时候买。V1.4 用 MA20/50/200 + 均线斜率区分下跌、修复、确认。V1.5 再把估值与趋势组合成 Entry State。</p></article><article><b>Entry State</b><p>CONFIRMED = 低估 + 趋势确认；SETUP = 低估 + 趋势修复；WATCH = 条件尚未完整；PASS = 模式外。</p></article><article><b>普通机会</b><p>风险预算按 Long Call 总上限的约 60%设计；重大重估允许使用更高预算。</p></article><article><b>Major Re-rating</b><p>重大叙事改变时，不因“涨很多”机械清仓，让趋势奔跑。</p></article><article><b>RKLX / 黑名单</b><p>不盈利、竞争压制、趋势难判断且波动大的模式外标的直接 Pass。</p></article><article><b>Call 风控</b><p>Long Call 总风险预算暂按账户 25%上限设计。</p></article></div></section><footer>Valuation data by TGMCharts · relative valuation screen, not intrinsic value. TGMCharts data refreshes daily.</footer></main>
}
