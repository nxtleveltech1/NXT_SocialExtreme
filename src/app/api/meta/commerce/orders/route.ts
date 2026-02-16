import { db } from "@/db/db";
import { channels, orders as ordersTable, orderItems } from "@/db/schema";
import { syncCommerceOrders } from "@/lib/integrations/meta-comprehensive";
import { eq, desc, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");
    const cmsId = searchParams.get("cmsId");
    const sync = searchParams.get("sync") === "true";

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    // Sync orders from Meta if requested
    if (sync && cmsId) {
      await syncCommerceOrders(Number(channelId), cmsId);
    }

    // Fetch orders from database
    const ordersList = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.conversationId, Number(channelId)))
      .orderBy(desc(ordersTable.createdAt))
      .limit(100);

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      ordersList.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return {
          ...order,
          items,
        };
      })
    );

    // Calculate summary metrics
    const totalSales = ordersList.reduce((sum, order) => sum + order.totalAmount, 0);
    const openOrders = ordersList.filter((o) => 
      ["pending", "confirmed", "processing"].includes(o.status || "")
    ).length;
    const deliveredOrders = ordersList.filter((o) => o.status === "delivered").length;

    return NextResponse.json({
      orders: ordersWithItems,
      summary: {
        totalOrders: ordersList.length,
        openOrders,
        deliveredOrders,
        totalSales,
        currency: ordersList[0]?.currency || "USD",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch orders";
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



