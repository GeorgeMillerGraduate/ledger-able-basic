import { NextResponse } from 'next/server';
import { apiResponse } from '@/app/api-utils';
import { getAppUser, getOwnedBusiness, isSameOrigin } from '@/app/auth';
import { getPool } from '@/db/pool.mjs';
import { basicService } from '@/server/basic-service.mjs';
import { ValidationError } from '@/lib/basic-values.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request, read=false){
 if(!read&&!isSameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const user=await getAppUser();const business=user?await getOwnedBusiness(user.id):null;
 if(!user||!business)return NextResponse.json({error:'Sign in and create a business first.'},{status:401});
 try{
  const raw=read?'{}':await request.text();if(raw.length>2500000)return NextResponse.json({error:'Request is too large.'},{status:413});
  const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw new ValidationError('Expected a JSON object.');
  const result=await basicService(getPool(),{userId:user.id,businessId:business.id},read?'list':body.op,body);
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof ValidationError)return NextResponse.json({error:e.message},{status:400});throw e;}
}
export async function GET(request:Request){return apiResponse(()=>handle(request,true));}
export async function POST(request:Request){return apiResponse(()=>handle(request));}
