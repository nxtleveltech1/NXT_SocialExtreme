import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import { salesProducts } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export const dynamic = "force-dynamic"

// GET /api/sales/products - List all active products
export async function GET(req: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

// POST /api/sales/products - Create a new product
export async function POST(req: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}

