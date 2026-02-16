import { NextRequest, NextResponse } from "next/server";
import { syncProducts } from "@/lib/integrations/meta-comprehensive";
import { db } from "@/db/db";
import { products, productCatalogs, channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const searchParams = req.nextUrl.searchParams;
    const catalogId = searchParams.get("catalogId");

    if (!catalogId) {
      return NextResponse.json(
        { error: "catalogId required" },
        { status: 400 }
      );
    }

    // Sync products
    await syncProducts(parseInt(catalogId));

    // Return products
    const productsList = await db
      .select()
      .from(products)
      .where(eq(products.catalogId, parseInt(catalogId)));

    return NextResponse.json({ products: productsList });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const {
      catalogId,
      name,
      description,
      price,
      currency,
      availability,
      condition,
      brand,
      category,
      imageUrl,
      url,
    } = body;

    if (!catalogId || !name) {
      return NextResponse.json(
        { error: "catalogId and name required" },
        { status: 400 }
      );
    }

    const [catalog] = await db
      .select()
      .from(productCatalogs)
      .where(eq(productCatalogs.id, parseInt(catalogId)))
      .limit(1);

    if (!catalog || !catalog.platformCatalogId) {
      return NextResponse.json({ error: "Catalog not found" }, { status: 404 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, catalog.channelId))
      .limit(1);

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const { MetaApiClient } = await import("@/lib/integrations/meta-client");
    const { decryptSecret } = await import("@/lib/crypto");
    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    const product = await client.createProduct(catalog.platformCatalogId, {
      name,
      description,
      price: price ? Math.round(price / 100) : undefined, // Convert from cents
      currency: currency || "USD",
      availability: availability || "in stock",
      condition,
      brand,
      category,
      image_url: imageUrl,
      url,
    });

    // Sync to get full product data
    await syncProducts(parseInt(catalogId));

    return NextResponse.json({ product });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

