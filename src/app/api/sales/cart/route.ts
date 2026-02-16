import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import { shoppingCarts, cartItems, salesProducts, whatsappConversations } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export const dynamic = "force-dynamic"

// GET /api/sales/cart?conversationId=X - Get cart for a conversation
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
    }

    // Find or create cart
    let [cart] = await db
      .select()
      .from(shoppingCarts)
      .where(
        and(
          eq(shoppingCarts.conversationId, parseInt(conversationId)),
          eq(shoppingCarts.status, "active")
        )
      )
      .limit(1)

    if (!cart) {
      // Get conversation to get phone number
      const [conversation] = await db
        .select()
        .from(whatsappConversations)
        .where(eq(whatsappConversations.id, parseInt(conversationId)))
        .limit(1)

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      }

      const [newCart] = await db
        .insert(shoppingCarts)
        .values({
          conversationId: parseInt(conversationId),
          phoneNumber: conversation.phoneNumber,
          status: "active",
        })
        .returning()

      cart = newCart
    }

    // Get cart items
    const items = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        priceAtTime: cartItems.priceAtTime,
        productName: salesProducts.name,
        productImage: salesProducts.image,
        price: salesProducts.price,
      })
      .from(cartItems)
      .innerJoin(salesProducts, eq(cartItems.productId, salesProducts.id))
      .where(eq(cartItems.cartId, cart.id))

    return NextResponse.json({
      cartId: cart.id,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        price: item.priceAtTime, // Use price at time of adding
        quantity: item.quantity,
      })),
    })
  } catch (error: unknown) {
    console.error("Error fetching cart:", error)
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 })
  }
}

// POST /api/sales/cart - Add item to cart
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { conversationId, productId, quantity = 1 } = body

    if (!conversationId || !productId) {
      return NextResponse.json({ error: "conversationId and productId are required" }, { status: 400 })
    }

    // Get or create cart
    let [cart] = await db
      .select()
      .from(shoppingCarts)
      .where(
        and(
          eq(shoppingCarts.conversationId, parseInt(conversationId)),
          eq(shoppingCarts.status, "active")
        )
      )
      .limit(1)

    if (!cart) {
      const [conversation] = await db
        .select()
        .from(whatsappConversations)
        .where(eq(whatsappConversations.id, parseInt(conversationId)))
        .limit(1)

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      }

      const [newCart] = await db
        .insert(shoppingCarts)
        .values({
          conversationId: parseInt(conversationId),
          phoneNumber: conversation.phoneNumber,
          status: "active",
        })
        .returning()

      cart = newCart
    }

    // Get product
    const [product] = await db
      .select()
      .from(salesProducts)
      .where(eq(salesProducts.id, productId))
      .limit(1)

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))
      .limit(1)

    if (existingItem) {
      // Update quantity
      await db
        .update(cartItems)
        .set({ quantity: existingItem.quantity + quantity })
        .where(eq(cartItems.id, existingItem.id))
    } else {
      // Add new item
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId,
        quantity,
        priceAtTime: product.price,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Error adding to cart:", error)
    return NextResponse.json({ error: "Failed to add to cart" }, { status: 500 })
  }
}

// PATCH /api/sales/cart - Update item quantity
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { conversationId, productId, quantity } = body

    if (!conversationId || !productId || quantity === undefined) {
      return NextResponse.json(
        { error: "conversationId, productId, and quantity are required" },
        { status: 400 }
      )
    }

    // Get cart
    const [cart] = await db
      .select()
      .from(shoppingCarts)
      .where(
        and(
          eq(shoppingCarts.conversationId, parseInt(conversationId)),
          eq(shoppingCarts.status, "active")
        )
      )
      .limit(1)

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 })
    }

    // Update item
    await db
      .update(cartItems)
      .set({ quantity })
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Error updating cart:", error)
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 })
  }
}

// DELETE /api/sales/cart - Remove item from cart
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { conversationId, productId } = body

    if (!conversationId || !productId) {
      return NextResponse.json({ error: "conversationId and productId are required" }, { status: 400 })
    }

    // Get cart
    const [cart] = await db
      .select()
      .from(shoppingCarts)
      .where(
        and(
          eq(shoppingCarts.conversationId, parseInt(conversationId)),
          eq(shoppingCarts.status, "active")
        )
      )
      .limit(1)

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 })
    }

    // Remove item
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Error removing from cart:", error)
    return NextResponse.json({ error: "Failed to remove from cart" }, { status: 500 })
  }
}



