import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import { salesProducts } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

// GET /api/sales/products - List all active products
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get("channelId")
    const category = searchParams.get("category")

    const products = await db
      .select()
      .from(salesProducts)
      .where(
        and(
          eq(salesProducts.isActive, true),
          channelId ? eq(salesProducts.channelId, parseInt(channelId)) : undefined
        )
      )

    // Filter by category if provided
    const filteredProducts = category
      ? products.filter((p) => p.category === category)
      : products

    return NextResponse.json(filteredProducts)
  } catch (error: unknown) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

// POST /api/sales/products - Create a new product
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json()
    const {
      channelId,
      name,
      description,
      price,
      currency = "ZAR",
      image,
      category,
      features,
      specifications,
      availability = "in stock",
    } = body

    if (!name || !price) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 })
    }

    const [product] = await db
      .insert(salesProducts)
      .values({
        channelId: channelId ? parseInt(channelId) : null,
        name,
        description,
        price: Math.round(price * 100), // Convert to cents
        currency,
        image,
        category,
        features: features || [],
        specifications: specifications || {},
        availability,
        isActive: true,
      })
      .returning()

    return NextResponse.json(product, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}

// PUT /api/sales/products - Update an existing product
export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json()
    const {
      id,
      name,
      description,
      price,
      category,
      availability,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    if (!name || !price) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 })
    }

    const [product] = await db
      .update(salesProducts)
      .set({
        name,
        description,
        price: Math.round(price * 100), // Convert to cents
        category,
        availability,
        updatedAt: new Date(),
      })
      .where(eq(salesProducts.id, parseInt(id)))
      .returning()

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error: unknown) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

// DELETE /api/sales/products - Delete a product
export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    const [product] = await db
      .delete(salesProducts)
      .where(eq(salesProducts.id, parseInt(id)))
      .returning()

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Error deleting product:", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}

