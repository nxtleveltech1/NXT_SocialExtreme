import { db } from "@/db/db";
import { followers } from "@/db/schema";
import { desc, eq, like } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const segment = searchParams.get('segment');

    let query = db.select().from(followers);

    if (search) {
      // @ts-ignore
      query = query.where(like(followers.username, `%${search}%`));
    }

    if (segment && segment !== 'All') {
      // @ts-ignore
      query = query.where(eq(followers.segment, segment));
    }

    const data = await query.orderBy(desc(followers.engagementScore));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Follower Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch followers" }, { status: 500 });
  }
}
