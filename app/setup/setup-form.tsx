"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function BusinessSetupForm() {
  const router = useRouter();
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  async function submit(form:FormData){
    setSaving(true);setError("");
    try{const response=await fetch("/api/business",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:form.get("name"),businessType:form.get("businessType"),accountingYearStart:form.get("accountingYearStart")})});
    const result=await response.json();
    if(!response.ok){setError(result.error??"Your business could not be created.");setSaving(false);return}
    router.replace("/dashboard");router.refresh();}catch{setError("Your business could not be created. Check your connection and try again.");setSaving(false)}
  }
  return <form action={submit} className="setup-form"><div><Label htmlFor="business-name">Business name</Label><Input id="business-name" name="name" required maxLength={100} placeholder="For example, Miller Web Services"/></div><div><Label htmlFor="business-type">Business type</Label><Select name="businessType" defaultValue="sole_trader"><SelectTrigger id="business-type" className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="sole_trader">Sole trader</SelectItem><SelectItem value="limited_company">Limited company</SelectItem><SelectItem value="partnership">Partnership</SelectItem></SelectContent></Select></div><div><Label htmlFor="year-start">Accounting year starts</Label><Input id="year-start" name="accountingYearStart" type="date" required defaultValue={`${new Date().getFullYear()}-04-06`}/></div>{error&&<p className="form-error">{error}</p>}<Button disabled={saving} className="w-full">{saving?"Creating your books…":"Create empty books"}</Button><small>Check these details before continuing. Profile editing is coming soon.</small></form>
}
