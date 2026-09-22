'use client'

import { useMemo, useState } from 'react'

type Stock = { ticker:string; name:string; valuation:number|null; fundamental:number; narrative:number; trend:number; iv:number; call:number; mode:'Major Re-rating'|'Ordinary opportunity'|'Pass'; note:string }

const stocks: Stock[] = [
 {ticker:'GOOG',name:'Alphabet',valuation:86,fundamental:94,narrative:92,trend:78,iv:76,call:88,mode:'Major Re-rating',note:'AI / Search / Cloud narrative can drive valuation re-rating.'},
 {ticker:'META',name:'Meta Platforms',valuation:82,fundamental:93,narrative:88,trend:84,iv:72,call:87,mode:'Major Re-rating',note:'Strong earnings engine; watch valuation versus forward expectations.'},
 {ticker:'NVDA',name:'NVIDIA',valuation:74,fundamental:96,narrative:90,trend:82,iv:68,call:84,mode:'Ordinary opportunity',note:'Excellent fundamentals, but valuation discipline matters.'},
 {ticker:'MSFT',name:'Microsoft',valuation:72,fundamental:95,narrative:84,trend:76,iv:79,call:81,mode:'Ordinary opportunity',note:'Quality compounder; wait for attractive entry valuation.'},
 {ticker:'AMZN',name:'Amazon',valuation:79,fundamental:88,narrative:81,trend:73,iv:75,call:80,mode:'Ordinary opportunity',note:'AWS / retail margin improvement; confirm trend before sizing.'},
 {ticker:'AAPL',name:'Apple',valuation:64,fundamental:86,narrative:70,trend:69,iv:83,call:73,mode:'Pass',note:'Not sufficiently undervalued for this framework.'},
 {ticker:'TSLA',name:'Tesla',valuation:null,fundamental:70,narrative:68,trend:65,iv:60,call:0,mode:'Pass',note:'Excluded by strategy rule: valuation considered excessively high.'},
]

const score = (s:Stock) => s.valuation === null ? 0 : Math.round(s.valuation*.30+s.fundamental*.20+s.narrative*.15+s.trend*.20+s.iv*.05+s.call*.10)

export default function Home(){
 const [selected,setSelected]=useState('GOOG')
 const [price,setPrice]=useState('')
 const [premium,setPremium]=useState('')
 const [budget,setBudget]=useState('800')
 const stock=useMemo(()=>stocks.find(s=>s.ticker===selected)!,[selected])
 const contracts=Number(premium)>0?Math.floor(Number(budget)/(Number(premium)*100)):0
 return <main>
  <header><div><span className="eyebrow">INVEST / MAGS LONG CALL</span><h1>MAGS Radar</h1><p>低估 → 趋势确认 → Long Call。重大重估与普通机会使用不同的持仓规则。</p></div><div className="badge">V1.0 · Decision System</div></header>
  <section className="grid">
   {stocks.map(s=><button key={s.ticker} onClick={()=>setSelected(s.ticker)} className={'card '+(selected===s.ticker?'active':'')}>
    <div className="row"><b>{s.ticker}</b><span className={'state '+(s.mode==='Major Re-rating'?'green':s.mode==='Pass'?'gray':'yellow')}>{s.mode}</span></div>
    <strong>{score(s)||'—'}</strong><small>{s.name}</small>
   </button>)}
  </section>
  <section className="detail">
   <div className="panel hero"><div className="row"><div><span className="ticker">{stock.ticker}</span><h2>{stock.name}</h2></div><span className="score">{score(stock) || '—'}</span></div><p>{stock.note}</p><div className="meters">
    {([['Valuation',stock.valuation],['Fundamental',stock.fundamental],['Narrative',stock.narrative],['Trend',stock.trend],['IV',stock.iv],['Call',stock.call]] as [string,number|null][]).map(([label,v])=><div key={label}><div className="row"><span>{label}</span><b>{v ?? 'N/A'}</b></div><div className="bar"><i style={{width:`${v ?? 0}%`}}/></div></div>)}
   </div></div>
   <div className="panel"><h3>Call Calculator</h3><label>正股价格<input value={price} onChange={e=>setPrice(e.target.value)} placeholder="例如 250" /></label><label>Call价格 / contract<input value={premium} onChange={e=>setPremium(e.target.value)} placeholder="例如 5.50" /></label><label>风险预算<input value={budget} onChange={e=>setBudget(e.target.value)} /></label><div className="calc"><span>最大合约数</span><b>{contracts || '—'}</b></div><p className="muted">默认按每张期权 ×100 股计算。仓位是风险预算，不是买入建议。</p></div>
  </section>
  <section className="rules"><h2>你的交易规则</h2><div className="rulegrid"><article><b>01 · 估值</b><p>价格便宜只是候选条件。重点判断相对未来盈利预期是否低估。</p></article><article><b>02 · 趋势</b><p>估值决定“有没有资格买”，趋势决定“什么时候买”。不预测底部。</p></article><article><b>03 · 普通机会</b><p>小仓位、分批兑现；不要求普通交易复制超级行情。</p></article><article><b>04 · Major Re-rating</b><p>重大叙事改变时，核心仓不因“已经涨很多”而机械清仓，让趋势奔跑。</p></article><article><b>05 · 黑名单</b><p>不盈利、趋势难判断、高波动且不属于模式的标的直接 Pass。RKLX 属于这一类。</p></article><article><b>06 · 风险预算</b><p>Long Call 总风险预算上限暂按账户 25% 设计；单笔仓位随机会等级调整。</p></article></div></section>
  <footer>数据层预留 SocialWatcher API / market data adapter。当前评分为策略框架示例值，不代表实时行情。</footer>
 </main>
}
