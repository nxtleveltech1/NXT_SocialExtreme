import { put, del } from "@vercel/blob";
import { db } from "@/db/db";
import { mediaAssets } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export const runtime = "edge";

/**
 * Upload media to Vercel Blob storage.
 * Returns a permanent URL suitable for social media publishing.
 * 
 * POST /api/media/upload
 * Body: FormData with 'file' field
 * 
 * Response: { url, pathname, contentType, size }
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate file size (100MB max for videos, 10MB for images)
    const maxSize = file.type.startsWith("video/") ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate unique pathname
    const ext = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const pathname = `media/${timestamp}-${randomId}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    });

    // Store metadata in database
    const [asset] = await db
      .insert(mediaAssets)
      .values({
        url: blob.url,
        pathname: blob.pathname,
        contentType: file.type,
        size: file.size,
      })
      .returning();

    return NextResponse.json({
      id: asset.id,
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload media" },
      { status: 500 }
    );
  }
}

/**
 * Delete media from Vercel Blob storage.
 * 
 * DELETE /api/media/upload?id={assetId}
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing asset ID" }, { status: 400 });
    }

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, Number(id)))
      .limit(1);

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Delete from Vercel Blob
    await del(asset.url);

    // Remove from database
    await db.delete(mediaAssets).where(eq(mediaAssets.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Media delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}
