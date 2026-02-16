import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import {
  orders,
  orderItems,
  shoppingCarts,
  cartItems,
  salesProducts,
  whatsappConversations,
  channels,
} from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { sendWhatsAppMessageComprehensive } from "@/lib/integrations/meta-comprehensive"

export const dynamic = "force-dynamic"

// POST /api/sales/orders - Create order from cart and send via WhatsApp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { conversationId, phoneNumber, channelId, cartItems: items } = body

    if (!phoneNumber) {
      return NextResponse.json({ error: "phoneNumber is required" }, { status: 400 })
    }

    let cart: { id: number; conversationId: number | null; status: string } | undefined
    let cartItemsData: Array<Record<string, unknown>> = []

    if (conversationId) {
      // Get cart from conversation
      const [foundCart] = await db
        .select()
        .from(shoppingCarts)
        .where(
          and(
            eq(shoppingCarts.conversationId, parseInt(conversationId)),
            eq(shoppingCarts.status, "active")
          )
        )
        .limit(1)

      if (!foundCart) {
        return NextResponse.json({ error: "Cart not found" }, { status: 404 })
      }

      cart = foundCart

      // Get cart items
      const itemsData = await db
        .select({
          id: cartItems.id,
          productId: cartItems.productId,
          quantity: cartItems.quantity,
          priceAtTime: cartItems.priceAtTime,
          productName: salesProducts.name,
        })
        .from(cartItems)
        .innerJoin(salesProducts, eq(cartItems.productId, salesProducts.id))
        .where(eq(cartItems.cartId, cart.id))

      cartItemsData = itemsData
    } else if (items && items.length > 0) {
      // Use provided items (for non-conversation orders)
      cartItemsData = items
    } else {
      return NextResponse.json({ error: "No items in cart" }, { status: 400 })
    }

    if (cartItemsData.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    // Calculate total
    const totalAmount = cartItemsData.reduce(
      (sum, item) => sum + (item.priceAtTime || item.price) * item.quantity,
      0
    )

    // Get conversation info if available
    let conversation: { id: number; userName: string | null } | null = null
    if (conversationId) {
      const [conv] = await db
        .select()
        .from(whatsappConversations)
        .where(eq(whatsappConversations.id, parseInt(conversationId)))
        .limit(1)
      conversation = conv
    }

    // Create order
    const [order] = await db
      .insert(orders)
      .values({
        cartId: cart?.id,
        conversationId: conversationId ? parseInt(conversationId) : null,
        phoneNumber,
        userName: conversation?.userName || null,
        status: "pending",
        totalAmount,
        currency: "ZAR",
      })
      .returning()

    // Create order items
    for (const item of cartItemsData) {
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName || "Product",
        quantity: item.quantity,
        priceAtTime: item.priceAtTime || item.price,
        subtotal: (item.priceAtTime || item.price) * item.quantity,
      })
    }

    // Mark cart as converted
    if (cart) {
      await db.update(shoppingCarts).set({ status: "converted" }).where(eq(shoppingCarts.id, cart.id))
    }

    // Generate WhatsApp message
    let message = "🛒 *Hello! I would like to place an order:*\n\n"

    cartItemsData.forEach((item, index) => {
      const price = item.priceAtTime || item.price
      const subtotal = price * item.quantity
      message += `${index + 1}. *${item.productName || "Product"}*\n`
      message += `   Quantity: ${item.quantity}\n`
      message += `   Unit price: R ${(price / 100).toFixed(2)}\n`
      message += `   Subtotal: R ${(subtotal / 100).toFixed(2)}\n\n`
    })

    message += `💰 *Total: R ${(totalAmount / 100).toFixed(2)}*\n\n`
    message += "Awaiting confirmation and delivery information! 😊"

    // Send WhatsApp message if channelId is provided
    let whatsappMessageId: string | null = null
    if (channelId) {
      try {
        const result = await sendWhatsAppMessageComprehensive(
          parseInt(channelId),
          phoneNumber,
          message
        )
        whatsappMessageId = result.messages?.[0]?.id || null

        // Update order with message ID
        await db
          .update(orders)
          .set({ whatsappMessageId })
          .where(eq(orders.id, order.id))
      } catch (error: any) {
        console.error("Error sending WhatsApp message:", error)
        // Don't fail the order creation if WhatsApp fails
      }
    }

    return NextResponse.json({
      ...order,
      whatsappMessageId,
      message, // Return message in case WhatsApp sending failed
    })
  } catch (error: any) {
    console.error("Error creating order:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

// GET /api/sales/orders - List orders
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")
    const phoneNumber = searchParams.get("phoneNumber")

    let query = db.select().from(orders)

    if (conversationId) {
      query = query.where(eq(orders.conversationId, parseInt(conversationId)))
    } else if (phoneNumber) {
      query = query.where(eq(orders.phoneNumber, phoneNumber))
    }

    const ordersList = await query.orderBy(orders.createdAt)

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      ordersList.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id))

        return {
          ...order,
          items,
        }
      })
    )

    return NextResponse.json(ordersWithItems)
  } catch (error: any) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

