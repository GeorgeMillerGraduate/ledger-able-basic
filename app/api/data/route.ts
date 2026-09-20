import { apiResponse, validDate, validMoney } from "@/app/api-utils";
import { and, eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { entries } from "@/db/schema";
import { NextResponse } from "next/server";
import { getAppUser, getOwnedBusiness, isSameOrigin } from "@/app/auth";

export const dynamic = "force-dynamic";

async function context() {
  const user=await getAppUser();
  if(!user)return null;
  const business=await getOwnedBusiness(user.id);
  return business?{user,business}:null;
}

async function readEntries() {
  const ctx=await context();
  if(!ctx)return NextResponse.json({error:"Sign in and create a business first."},{status:401});
  const rows=await getDb().select({id:entries.id,kind:entries.kind,party:entries.party,category:entries.category,
    description:entries.description,amount:entries.amount,vatAmount:entries.vatAmount,entryDate:entries.entryDate,status:entries.status})
    .from(entries).where(and(eq(entries.businessId,ctx.business.id),eq(entries.userId,ctx.user.id)))
    .orderBy(desc(entries.entryDate),desc(entries.createdAt));
  return NextResponse.json({business:ctx.business,entries:rows});
}

async function createEntry(request:Request){
  if(!isSameOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  const ctx=await context();
  if(!ctx)return NextResponse.json({error:"Sign in and create a business first."},{status:401});
  const body=await request.json() as Record<string,unknown>;
  if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Expected a JSON object."},{status:400});
  const kind=body.kind==="expense"?"expense":body.kind==="sale"?"sale":null;
  const amount=Number(body.amount);const party=String(body.party??"").trim();const description=String(body.description??"").trim();const category=String(body.category??"Other").trim();const entryDate=String(body.entryDate??"").trim();const reference=String(body.reference??"").trim();
  if(!kind||!party||!description||!validDate(entryDate)||!validMoney(amount)||amount<=0||party.length>255||category.length>255||description.length>10000||reference.length>255)return NextResponse.json({error:"Please complete every required field."},{status:400});
  const id=crypto.randomUUID();const createdAt=new Date().toISOString();const vatAmount=Number(body.vatAmount??0);
  if(!validMoney(vatAmount))return NextResponse.json({error:"VAT must be a valid non-negative amount with at most two decimal places."},{status:400});
  await getDb().insert(entries).values({id,userId:ctx.user.id,businessId:ctx.business.id,kind,party,category,
    description:reference?`${description} · Ref: ${reference}`:description,amount,vatAmount,entryDate,status:"paid",createdAt});
  return NextResponse.json({id,kind,party,category,description:reference?`${description} · Ref: ${reference}`:description,amount,vatAmount,entryDate,status:"paid"},{status:201});
}

export async function GET() { return apiResponse(readEntries); }
export async function POST(request: Request) { return apiResponse(() => createEntry(request)); }
