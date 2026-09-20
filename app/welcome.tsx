import { BrandLogo } from "@/components/brand-logo";
import { ArrowRight, CheckCircle2, FileText, ReceiptText, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";

export function Welcome({ signedIn, configured, error }: { signedIn: boolean; configured: boolean; error?: string }) {
  const message = error === "google_not_configured"
    ? "Google sign-in needs a client ID and secret before it can be used."
    : error ? "Google sign-in could not be completed. Please try again." : null;
  return <main className="welcome">
    <header className="welcome-nav"><Link className="welcome-brand" href="/"><BrandLogo/></Link><a className="quiet-link" href={signedIn?"/dashboard":"/api/auth/google"}>{signedIn?"Open dashboard":"Sign in"}</a></header>
    <section className="welcome-hero">
      <div className="hero-copy"><p className="welcome-eyebrow">Straightforward bookkeeping</p><h1>A little clarity.<br/><em>A brighter business.</em></h1><p className="hero-lead">Record sales and expenses, understand your profit and keep your small business finances together—without an accounting degree.</p>
        {message&&<div className="auth-message">{message}</div>}
        <div className="welcome-actions">{signedIn?<Link className="google-button primary-welcome" href="/dashboard">Go to your dashboard <ArrowRight/></Link>:<a className={`google-button ${!configured?"needs-setup":""}`} href="/api/auth/google"><GoogleMark/> Continue with Google</a>}<span>Free while Ledger-able is being built.</span></div>
      </div>
      <div className="welcome-ledger" aria-label="Example of an empty new account">
        <div className="ledger-head"><span><b>New business</b><small>Your financial overview</small></span><span className="ready-pill">Ready</span></div>
        <div className="zero-grid"><div><small>Money in</small><strong>£0.00</strong></div><div><small>Money out</small><strong>£0.00</strong></div><div><small>Profit</small><strong>£0.00</strong></div></div>
        <div className="empty-ledger"><span><ReceiptText/></span><b>Your books start clean</b><p>Add your first real sale or expense when you’re ready.</p></div>
      </div>
    </section>
    <section className="welcome-features"><article><TrendingUp/><h2>Know where you stand</h2><p>See income, spending and estimated profit calculated from your real records.</p></article><article><FileText/><h2>Keep useful records</h2><p>Keep dates, customers, suppliers, categories and references together.</p></article><article><ShieldCheck/><h2>Your business stays yours</h2><p>Your records belong to your business, with secure Google sign-in and a private workspace.</p></article></section>
    <section className="welcome-steps"><div><p className="welcome-eyebrow">Start in three steps</p><h2>From blank books to a useful overview.</h2></div><ol><li><span>1</span><b>Sign in securely</b><small>Google confirms who you are. We never receive your password.</small></li><li><span>2</span><b>Create your business</b><small>Add its name, type and accounting year.</small></li><li><span>3</span><b>Enter real figures</b><small>Your dashboard updates from the records you save.</small></li></ol></section>
    <footer><span>Ledger-able</span><span><CheckCircle2/> Accounting made understandable.</span></footer>
  </main>
}

function GoogleMark(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5L15.4 17c-.9.6-2 .9-3.4.9a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22"/><path fill="#FBBC05" d="M6.5 13.9A6 6 0 0 1 6.2 12c0-.7.1-1.3.3-1.9V7.5H3.2A10 10 0 0 0 2 12c0 1.6.4 3.1 1.2 4.5z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.8 5.5l3.3 2.6a5.8 5.8 0 0 1 5.5-4"/></svg>}
