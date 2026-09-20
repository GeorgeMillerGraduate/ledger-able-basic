import "server-only";
import { NextResponse } from "next/server";

// Do not serialize database errors: Drizzle errors can include SQL parameters.
export async function apiResponse(action: () => Promise<Response>) {
  try { return await action(); }
  catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    console.error("Ledger-able API operation failed; check database connectivity and schema.");
    return NextResponse.json({ error: "The request could not be completed. Please try again." }, { status: 500 });
  }
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validMoney(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 9999999999999.99 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.001;
}
