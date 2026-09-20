import { apiResponse, validDate } from "@/app/api-utils";
import { getDb } from "@/db";
import { businesses } from "@/db/schema";
import { NextResponse } from "next/server";
import { getAppUser, getOwnedBusiness, isSameOrigin } from "@/app/auth";

async function createBusiness(request: Request) {
  if(!isSameOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  const user=await getAppUser();
  if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const existing=await getOwnedBusiness(user.id);
  if(existing)return NextResponse.json(existing);
  const body=await request.json() as Record<string,unknown>;
  if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Expected a JSON object."},{status:400});
  const name=String(body.name??"").trim();
  const businessType=String(body.businessType??"");
  const accountingYearStart=String(body.accountingYearStart??"");
  if(name.length<2||name.length>100||!["sole_trader","limited_company","partnership"].includes(businessType)||!validDate(accountingYearStart)){
    return NextResponse.json({error:"Please provide valid business details."},{status:400});
  }
  const id=crypto.randomUUID();const now=new Date().toISOString();
  await getDb().insert(businesses).values({id,ownerUserId:user.id,name,businessType,accountingYearStart,taxEstimateRate:0.2,createdAt:now,updatedAt:now});
  return NextResponse.json({id,name,businessType,accountingYearStart,taxEstimateRate:.2},{status:201});
}

export async function POST(request: Request) { return apiResponse(() => createBusiness(request)); }
