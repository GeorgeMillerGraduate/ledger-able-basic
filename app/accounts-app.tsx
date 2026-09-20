"use client";

import { BasicModule } from "./basic-modules";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, Building2, CalendarDays, Check, CircleAlert,
  ChevronDown, ContactRound, FileText, Landmark, LayoutDashboard,
  Menu, Plus, ReceiptText, Search, Settings, Sparkles,
  TrendingUp, WalletCards, X
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Entry = { id:string; kind:"sale"|"expense"; party:string; category:string; description:string; amount:number; vatAmount:number; entryDate:string; status:string };
type Business = { id:string; name:string; businessType:string; accountingYearStart:string; taxEstimateRate:number };
type Totals = { sales:number; expenses:number; profit:number; tax:number };
type Section = "Overview"|"Sales"|"Expenses"|"Invoices"|"Contacts"|"Banking"|"Taxes"|"Reports"|"Settings";
const nav:{label:Section;icon:typeof LayoutDashboard}[]=[
  {label:"Overview",icon:LayoutDashboard},{label:"Sales",icon:TrendingUp},{label:"Expenses",icon:ReceiptText},
  {label:"Invoices",icon:FileText},{label:"Contacts",icon:ContactRound},{label:"Banking",icon:Landmark},
  {label:"Taxes",icon:CalendarDays},{label:"Reports",icon:BarChart3}
];
const money=new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"});

export function AccountsApp({user,business,signOutPath}:{user:{name:string;email:string};business:Business;signOutPath:string}){
  const [section,setSection]=useState<Section>("Overview");
  const [entries,setEntries]=useState<Entry[]>([]);
  const [loading,setLoading]=useState(true);
  const [mobileNav,setMobileNav]=useState(false);
  const [dialog,setDialog]=useState<"sale"|"expense"|null>(null);
  const [notice,setNotice]=useState("");
  const [query,setQuery]=useState("");
  const menuRef=useRef<HTMLButtonElement>(null);
  const sidebarRef=useRef<HTMLElement>(null);
  useEffect(()=>{if(!mobileNav)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";sidebarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();function key(e:KeyboardEvent){if(e.key==="Escape"){setMobileNav(false);menuRef.current?.focus()}if(e.key==="Tab"){const nodes=sidebarRef.current?.querySelectorAll<HTMLButtonElement>("button");if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}document.addEventListener("keydown",key);return()=>{document.body.style.overflow=previous;document.removeEventListener("keydown",key)}},[mobileNav]);
  useEffect(()=>{fetch("/api/data").then(r=>r.ok?r.json():Promise.reject()).then(d=>setEntries(d.entries??[])).catch(()=>setNotice("Your records could not be loaded just now.")).finally(()=>setLoading(false));},[]);
  useEffect(()=>{
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options?:{signal?:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    void Promise.resolve(context.registerTool({
      name:"start_business_record",title:"Start a business record",
      description:"Open the form to record a new sale or expense in Ledger-able.",
      inputSchema:{type:"object",properties:{kind:{type:"string",enum:["sale","expense"]}},required:["kind"],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(input:unknown){const kind=(input as {kind?:unknown})?.kind;if(kind!=="sale"&&kind!=="expense")throw new Error("kind must be sale or expense");setDialog(kind);return{opened:true,kind}}
    },{signal:lifecycle.signal})).catch(()=>{});
    return()=>lifecycle.abort();
  },[]);
  const totals=useMemo(()=>{const sales=entries.filter(e=>e.kind==="sale").reduce((s,e)=>s+Number(e.amount),0);const expenses=entries.filter(e=>e.kind==="expense").reduce((s,e)=>s+Number(e.amount),0);return{sales,expenses,profit:sales-expenses,tax:Math.max(0,(sales-expenses)*Number(business.taxEstimateRate))}},[entries,business.taxEstimateRate]);
  async function addEntry(form:FormData){
    if(!dialog)return;
    const payload={kind:dialog,party:form.get("party"),description:form.get("description"),reference:form.get("reference"),category:form.get("category"),amount:form.get("amount"),entryDate:form.get("date"),vatAmount:0};
    try {
    const r=await fetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const result=await r.json();
    if(!r.ok)throw new Error(result.error??"Could not save that record.");
    setEntries(v=>[result,...v]);setNotice(`${dialog==="sale"?"Sale":"Expense"} saved.`);setDialog(null);
    } catch(error){throw new Error(error instanceof Error?error.message:"Could not save that record. Please try again.")}
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a><aside ref={sidebarRef} id="workspace-nav" className={`sidebar ${mobileNav?"sidebar-open":""}`}>
      <div className="brand"><Link href="/" aria-label="Ledger-able home"><BrandLogo/></Link><button className="mobile-close" onClick={()=>setMobileNav(false)} aria-label="Close menu"><X/></button></div>
      <div className="business-switch"><span className="business-icon"><Building2/></span><span><b>{business.name}</b><small>{businessTypeLabel(business.businessType)}</small></span></div>
      <nav aria-label="Main navigation"><p className="nav-label">Workspace</p>
        {nav.map(item=><button key={item.label} aria-current={section===item.label?"page":undefined} className={section===item.label?"active":""} onClick={()=>{setSection(item.label);setMobileNav(false)}}><item.icon/>{item.label}</button>)}
        <p className="nav-label nav-bottom">Account</p>
        <button className={section==="Settings"?"active":""} aria-current={section==="Settings"?"page":undefined} onClick={()=>{setSection("Settings");setMobileNav(false)}}><Settings/>Settings</button>
      </nav>
      <div className="free-plan"><Sparkles/><div><b>Free plan</b><small>Everything you need to start.</small></div><span>£0</span></div>
    </aside>
    {mobileNav&&<button className="scrim" onClick={()=>setMobileNav(false)} aria-label="Close menu"/>}
    <main className="main">
      <header className="topbar"><button ref={menuRef} aria-expanded={mobileNav} aria-controls="workspace-nav" className="menu-button" onClick={()=>setMobileNav(true)} aria-label="Open menu"><Menu/></button>
        <div className="search"><Search/><input aria-label="Search sales and expenses" placeholder="Search your records…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <span className="period"><CalendarDays/> All recorded dates</span>
        <div className="user-menu"><span>{initials(user.name)}</span><div><b>{shortName(user.name)}</b><small>{user.email}</small></div><a href={signOutPath} target="_top" title="Sign out" aria-label="Sign out"><ChevronDown/></a></div>
      </header>
      <div className="page" id="main-content" tabIndex={-1}>{notice&&<div className="toast" role="status">{notice.endsWith("saved.")?<Check/>:<CircleAlert/>}{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice("")}><X/></button></div>}
        {query.trim()?<section className="panel"><div className="panel-heading"><div><p className="eyebrow">Your workspace</p><h1>Search results</h1></div><Button variant="outline" onClick={()=>setQuery("")}>Clear search</Button></div><EntriesTable entries={entries.filter(e=>[e.party,e.description,e.category,e.entryDate].some(v=>v.toLowerCase().includes(query.toLowerCase())))}/></section>:section==="Overview"?<Overview userName={user.name} totals={totals} entries={entries} loading={loading} onAdd={setDialog} onNavigate={setSection}/>:(["Invoices","Contacts","Banking"].includes(section)?<BasicModule key={section} section={section} business={business} onAccountingChange={()=>{fetch("/api/data").then(r=>r.ok?r.json():Promise.reject()).then(d=>setEntries(d.entries??[])).catch(()=>setNotice("Please reload to refresh your accounting records."));}}/>:<SectionPage business={business} section={section} entries={entries} totals={totals} onAdd={setDialog}/>)}
      </div>
    </main>
    <EntryDialog key={dialog??"closed"} type={dialog} onOpenChange={o=>!o&&setDialog(null)} onSubmit={addEntry}/>
  </div>
}

function Overview({userName,totals,entries,loading,onAdd,onNavigate}:{userName:string;totals:Totals;entries:Entry[];loading:boolean;onAdd:(v:"sale"|"expense")=>void;onNavigate:(s:Section)=>void}){
  const today=new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"numeric",month:"long"}).format(new Date());
  return <><div className="page-heading"><div><p className="eyebrow">{today}</p><h1>Good {greeting()}, {shortName(userName)}.</h1><p>Your business at a glance. Every recorded sale and expense.</p></div><div className="heading-actions"><Button variant="outline" onClick={()=>onAdd("expense")}><ArrowDownLeft/> Add expense</Button><Button onClick={()=>onAdd("sale")}><Plus/> Add sale</Button></div></div>
  <section className="metric-grid"><Metric label="Money in" value={totals.sales} note="Sales received" icon={ArrowUpRight} tone="green"/><Metric label="Money out" value={totals.expenses} note="Business expenses" icon={ArrowDownLeft} tone="amber"/><Metric label="Estimated profit" value={totals.profit} note="Before tax" icon={TrendingUp} tone="blue"/><Metric label="Tax set-aside" value={totals.tax} note="Using your business estimate rate" icon={WalletCards} tone="navy"/></section>
  <div className="dashboard-grid"><section className="panel cashflow"><div className="panel-heading"><div><h2>Cash flow</h2><p>Money moving through your business</p></div><span className={totals.profit<0?"negative":"positive"}>{money.format(totals.profit)} net</span></div><CashflowChart entries={entries}/></section>
  <section className="panel checklist"><div className="panel-heading"><div><h2>Up next</h2><p>Small jobs to keep things tidy</p></div></div><Task checked title="Set up your account" text="Your free workspace is ready"/><button className="next-action" onClick={()=>onAdd("sale")}><Plus/><span><b>Keep your books up to date</b><small>Record a sale or business expense</small></span><ArrowUpRight/></button><button className="next-action" onClick={()=>onNavigate("Taxes")}><WalletCards/><span><b>Review your tax set-aside</b><small>See your current planning estimate</small></span><ArrowUpRight/></button></section></div>
  <section className="panel recent"><div className="panel-heading"><div><h2>Recent activity</h2><p>{loading?"Loading your records…":entries.length?"Your latest business transactions":"Your books are ready for real figures"}</p></div>{entries.length>0&&<button className="text-button" onClick={()=>onNavigate("Sales")}>View all</button>}</div>{loading?<div className="chart-empty" role="status"><BarChart3/><p>Loading your records…</p></div>:entries.length?<EntriesTable entries={[...entries].sort((a,b)=>b.entryDate.localeCompare(a.entryDate)).slice(0,5)}/>:<EmptyTransactions onAdd={onAdd}/>}</section></>
}

function SectionPage({business,section,entries,totals,onAdd}:{business:Business;section:Section;entries:Entry[];totals:Totals;onAdd:(v:"sale"|"expense")=>void}){
  const filtered=section==="Sales"?entries.filter(e=>e.kind==="sale"):section==="Expenses"?entries.filter(e=>e.kind==="expense"):entries;
  const copy:Record<Section,string>={Overview:"",Sales:"Track every payment your business receives.",Expenses:"Keep purchases organised and ready for tax time.",Invoices:"Create, send and follow up invoices.",Contacts:"Keep customer and supplier details together.",Banking:"Match bank activity to your records.",Taxes:"See what to put aside and when it may be due.",Reports:"Understand profit, spending and cash flow.",Settings:"Manage your business profile and free plan."};
  return <><div className="page-heading"><div><p className="eyebrow">My business</p><h1>{section}</h1><p>{copy[section]}</p></div>{(section==="Sales"||section==="Expenses")&&<Button onClick={()=>onAdd(section==="Sales"?"sale":"expense")}><Plus/> Add {section==="Sales"?"sale":"expense"}</Button>}</div>
  {section==="Sales"||section==="Expenses"?<section className="panel"><div className="panel-heading"><div><h2>{section} records</h2><p>{filtered.length} items · {money.format(filtered.reduce((s,e)=>s+Number(e.amount),0))}</p></div></div>{filtered.length?<EntriesTable entries={filtered}/>:<EmptyTransactions kind={section==="Sales"?"sale":"expense"} onAdd={onAdd}/>}</section>:<FeatureSurface business={business} section={section} totals={totals} entries={entries}/>}</>
}

function FeatureSurface({business,section,totals,entries}:{business:Business;section:Section;totals:Totals;entries:Entry[]}){
  if(section==="Taxes")return <div className="feature-grid"><section className="panel tax-card"><p className="eyebrow">Estimated set-aside</p><strong>{money.format(totals.tax)}</strong><p>Based on your recorded income and expenses. This is a planning estimate, not tax advice.</p><small>Estimate rate: {Number(business.taxEstimateRate)*100}% of positive recorded profit</small></section><InfoPanel title="About this estimate" rows={["Uses all recorded income and expenses","Does not calculate a tax return or VAT liability","Confirm applicable deadlines for your business"]}/></div>;
  if(section==="Reports")return <><section className="metric-grid three"><Metric label="Turnover" value={totals.sales} note="All recorded dates" icon={TrendingUp} tone="green"/><Metric label="Costs" value={totals.expenses} note="All recorded dates" icon={ReceiptText} tone="amber"/><Metric label="Net profit" value={totals.profit} note="Before tax" icon={BarChart3} tone="blue"/></section><section className="panel"><div className="panel-heading"><div><h2>Profit and loss</h2><p>{business.name} · All recorded dates · GBP</p></div><Button variant="outline" onClick={()=>window.print()}>Print / save PDF</Button></div><div className="report-lines"><div><span>Total income</span><b>{money.format(totals.sales)}</b></div><div><span>Total expenses</span><b>{money.format(totals.expenses)}</b></div><div className={totals.profit<0?"report-total loss":"report-total"}><span>Profit before tax</span><b>{money.format(totals.profit)}</b></div></div><CashflowChart entries={entries}/></section></>;
  if(section==="Invoices")return <EmptyFeature icon={FileText} title="Send your first professional invoice" text="Create branded invoices, set payment terms and see what is overdue." action="New invoice"/>;
  if(section==="Contacts")return <EmptyFeature icon={ContactRound} title="No contacts yet" text="Customers and suppliers will appear here once contact management is enabled." action="Add contact"/>;
  if(section==="Banking")return <EmptyFeature icon={Landmark} title="Connect a business bank account" text="Bring transactions into one place, then match them with your sales and expenses." action="Connect account"/>;
  return <div className="settings-grid"><section className="panel"><div className="panel-heading"><div><h2>Business details</h2><p>Used on invoices and reports</p></div></div><div className="form-stack"><Label htmlFor="profile-name">Business name</Label><Input id="profile-name" readOnly value={business.name}/><Label htmlFor="profile-type">Business type</Label><Input id="profile-type" readOnly value={businessTypeLabel(business.businessType)}/><Label htmlFor="profile-year">Accounting year starts</Label><Input id="profile-year" readOnly value={new Date(`${business.accountingYearStart}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}/><small>Editing these details will be added in the next accounting phase.</small></div></section><section className="panel plan-card"><Sparkles/><h2>Free while we build</h2><p>All current tools are included. Paid plans can be introduced later without changing your records.</p><div><span>Current plan</span><b>Free · £0/month</b></div></section></div>
}

function Metric({label,value,note,icon:Icon,tone}:{label:string;value:number;note:string;icon:typeof LayoutDashboard;tone:string}){return <article className={`metric ${tone}`}><div className="metric-top"><span>{label}</span><i><Icon/></i></div><strong className={value<0?"loss":undefined}>{money.format(value)}</strong><small>{note}</small></article>}
function Task({checked=false,title,text}:{checked?:boolean;title:string;text:string}){return <div className="task"><span className={checked?"task-check done":"task-check"}>{checked&&<Check/>}</span><div><b>{title}</b><small>{text}</small></div></div>}
function InfoPanel({title,rows}:{title:string;rows:string[]}){return <section className="panel"><div className="panel-heading"><h2>{title}</h2></div>{rows.map((r,i)=><div className="info-row" key={r}><span>{i+1}</span>{r}</div>)}</section>}
function EmptyFeature({icon:Icon,title,text,action}:{icon:typeof LayoutDashboard;title:string;text:string;action:string}){return <section className="panel empty-feature"><span><Icon/></span><h2>{title}</h2><p>{text}</p><span className="coming-soon">Coming soon · {action}</span><small className="feature-note">This module is not yet available. Sales and expense recording are ready to use.</small></section>}
function EntriesTable({entries}:{entries:Entry[]}){
  const [search,setSearch]=useState("");const [sort,setSort]=useState("newest");const [page,setPage]=useState(0);
  const rows=useMemo(()=>entries.filter(e=>[e.party,e.description,e.category].some(v=>v.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>sort==="amount"?Number(b.amount)-Number(a.amount):sort==="oldest"?a.entryDate.localeCompare(b.entryDate):b.entryDate.localeCompare(a.entryDate)),[entries,search,sort]);
  const pages=Math.max(1,Math.ceil(rows.length/10));const current=Math.min(page,pages-1);
  return <><div className="table-tools"><label className="table-search"><Search/><input aria-label="Filter records" placeholder="Filter by name, description or category" value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}/></label><select aria-label="Sort records" value={sort} onChange={e=>{setSort(e.target.value);setPage(0)}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount">Highest amount</option></select></div><div className="table-wrap" role="region" aria-label="Transaction records; scroll horizontally for more columns" tabIndex={0}><table><caption className="sr-only">Recorded sales and expenses in pounds sterling</caption><thead><tr><th scope="col">Date</th><th scope="col">From / to</th><th scope="col">Description</th><th scope="col">Category</th><th scope="col">Status</th><th scope="col" className="amount">Amount</th></tr></thead><tbody>{rows.slice(current*10,current*10+10).map(e=><tr key={e.id}><td data-label="Date">{new Date(`${e.entryDate}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</td><td data-label="From / to"><div className="party"><span className={e.kind}>{e.kind==="sale"?<ArrowUpRight/>:<ArrowDownLeft/>}</span><b>{e.party}</b></div></td><td data-label="Description">{e.description}</td><td data-label="Category"><span className="category">{e.category}</span></td><td data-label="Status"><span className="status-badge">{e.status}</span></td><td data-label="Amount" className={`amount ${e.kind}`}>{e.kind==="sale"?"+":"−"}{money.format(Number(e.amount))}</td></tr>)}</tbody></table>{!rows.length&&<p className="table-empty">No matching records. Try a different search.</p>}</div><div className="pagination"><span>{rows.length?current*10+1:0}–{Math.min((current+1)*10,rows.length)} of {rows.length} records</span><div><Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous</Button><Button variant="outline" disabled={current===pages-1} onClick={()=>setPage(current+1)}>Next</Button></div></div></>
}
function CashflowChart({entries}:{entries:Entry[]}){
  const data=useMemo(()=>{const months=new Map<string,{month:string;Income:number;Expenses:number}>();for(const e of entries){const key=e.entryDate.slice(0,7);if(!months.has(key))months.set(key,{month:key,Income:0,Expenses:0});months.get(key)![e.kind==="sale"?"Income":"Expenses"]+=Number(e.amount)}return [...months.values()].sort((a,b)=>a.month.localeCompare(b.month))},[entries]);
  if(!data.length)return <div className="chart-empty"><BarChart3/><b>Your financial picture starts here</b><p>Add a sale or expense to see monthly income and spending.</p></div>;
  return <div className="financial-chart" role="group" aria-label="Income and expenses by recorded month, in pounds sterling"><ResponsiveContainer width="100%" height={270}><BarChart data={data} accessibilityLayer margin={{top:15,right:8,left:0,bottom:5}}><CartesianGrid vertical={false} stroke="#DFE7DF" strokeDasharray="3 4"/><XAxis dataKey="month" tickFormatter={v=>new Date(`${v}-01T12:00:00`).toLocaleDateString("en-GB",{month:"short",year:"2-digit"})} tickLine={false} axisLine={false} fontSize={11}/><YAxis tickFormatter={v=>Math.abs(v)>=1000?`£${v/1000}k`:`£${v}`} tickLine={false} axisLine={false} fontSize={11} width={64}/><Tooltip formatter={v=>money.format(Number(v))} cursor={{fill:"#F3F9EF"}} contentStyle={{borderRadius:12,borderColor:"#DFE7DF"}}/><Legend iconType="circle" formatter={value=><span style={{color:"#526158"}}>{value}</span>}/><Bar isAnimationActive={false} dataKey="Income" fill="#6DBE45" radius={[5,5,0,0]} maxBarSize={32}/><Bar isAnimationActive={false} dataKey="Expenses" fill="#C18B46" radius={[5,5,0,0]} maxBarSize={32}/></BarChart></ResponsiveContainer><details className="chart-data"><summary>View chart figures</summary>{data.map(row=><p key={row.month}>{row.month}: Income {money.format(row.Income)} · Expenses {money.format(row.Expenses)}</p>)}</details></div>
}

function EmptyTransactions({kind,onAdd}:{kind?:"sale"|"expense";onAdd:(v:"sale"|"expense")=>void}){return <div className="empty-transactions"><span><ReceiptText/></span><b>No {kind?kind==="sale"?"sales":"expenses":"transactions"} yet</b><p>Add your first {kind??"sale or expense"} to begin keeping your books.</p><div>{(!kind||kind==="sale")&&<Button onClick={()=>onAdd("sale")}><Plus/> Add sale</Button>}{(!kind||kind==="expense")&&<Button variant="outline" onClick={()=>onAdd("expense")}><Plus/> Add expense</Button>}</div></div>}
function EntryDialog({type,onOpenChange,onSubmit}:{type:"sale"|"expense"|null;onOpenChange:(o:boolean)=>void;onSubmit:(f:FormData)=>Promise<void>}){const [saving,setSaving]=useState(false);const [error,setError]=useState("");async function submit(f:FormData){setSaving(true);setError("");try{await onSubmit(f)}catch(e){setError(e instanceof Error?e.message:"Could not save. Please try again.")}finally{setSaving(false)}}return <Dialog open={!!type} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Add {type}</DialogTitle><DialogDescription>Record money {type==="sale"?"received by":"spent by"} your business.</DialogDescription></DialogHeader><form action={submit} className="entry-form"><div><Label htmlFor="party">{type==="sale"?"Customer":"Supplier"}</Label><Input id="party" name="party" required placeholder={type==="sale"?"Who paid you?":"Who did you pay?"}/></div><div><Label htmlFor="description">Description</Label><Input id="description" name="description" required placeholder="What was this for?"/></div><div className="form-row"><div><Label htmlFor="amount">Amount (£)</Label><Input id="amount" name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00"/></div><div><Label htmlFor="date">Date</Label><Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></div></div><div><Label htmlFor="entry-category">Category</Label><Select name="category" defaultValue={type==="sale"?"Services":"Software"}><SelectTrigger id="entry-category" className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Services">Services</SelectItem><SelectItem value="Products">Products</SelectItem><SelectItem value="Software">Software</SelectItem><SelectItem value="Travel">Travel</SelectItem><SelectItem value="Equipment">Equipment</SelectItem><SelectItem value="Marketing">Marketing</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div><div><Label htmlFor="reference">Reference (optional)</Label><Input id="reference" name="reference" maxLength={80} placeholder="Invoice number, receipt or note"/></div>{error&&<p className="form-error" role="alert">{error}</p>}<div className="form-actions"><Button type="button" variant="outline" disabled={saving} onClick={()=>onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?"Saving…":`Save ${type}`}</Button></div></form></DialogContent></Dialog>}
function initials(name:string){return name.split(/[ @._-]/).filter(Boolean).slice(0,2).map(n=>n[0]).join("").toUpperCase()||"LA"}
function shortName(name:string){return name.includes("@")?name.split("@")[0]:name.split(" ")[0]}
function greeting(){const hour=new Date().getHours();return hour<12?"morning":hour<18?"afternoon":"evening"}
function businessTypeLabel(value:string){return value==="limited_company"?"Limited company":value==="partnership"?"Partnership":"Sole trader"}
