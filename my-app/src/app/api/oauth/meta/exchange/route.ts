import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptSecret } from "@/lib/crypto";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

/**
 * Exchange a short-lived token for a PERMANENT Page Access Token
 * 
 * Flow:
 * 1. Short-lived User Token → Long-lived User Token (60 days)
 * 2. Long-lived User Token → Permanent Page Access Token (never expires)
 */
export async function POST(req: NextRequest) {
  try {
    const { shortLivedToken, channelId } = await req.json();

    if (!shortLivedToken) {
      return NextResponse.json({ error: "shortLivedToken required" }, { status: 400 });
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json({ 
        error: "META_APP_ID and META_APP_SECRET must be set in .env.local",
        setup: "Go to https://developers.facebook.com/apps → Your App → Settings → Basic"
      }, { status: 500 });
    }

    // Step 1: Exchange short-lived token for long-lived user token
    console.log("Step 1: Exchanging for long-lived user token...");
    const longLivedRes = await fetch(
      `${FB_GRAPH_URL}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `fb_exchange_token=${shortLivedToken}`
    );
    
    const longLivedData = await longLivedRes.json();
    
    if (longLivedData.error) {
      return NextResponse.json({ 
        error: "Failed to exchange token",
        details: longLivedData.error.message
      }, { status: 400 });
    }

    const longLivedUserToken = longLivedData.access_token;
    console.log("✅ Got long-lived user token (expires in", longLivedData.expires_in, "seconds)");

    // Step 2: Get Page Access Tokens (these are PERMANENT when from long-lived user token)
    console.log("Step 2: Getting permanent page tokens...");
    const pagesRes = await fetch(
      `${FB_GRAPH_URL}/me/accounts?` +
      `fields=id,name,access_token,instagram_business_account{id,username,followers_count}&` +
      `access_token=${longLivedUserToken}`
    );
    
    const pagesData = await pagesRes.json();
    
    if (pagesData.error) {
      return NextResponse.json({ 
        error: "Failed to get pages",
        details: pagesData.error.message
      }, { status: 400 });
    }

    const pages = pagesData.data || [];
    console.log(`✅ Found ${pages.length} page(s)`);

    // Process each page
    const results = [];
    for (const page of pages) {
      const pageToken = page.access_token; // This is PERMANENT!
      const ig = page.instagram_business_account;

      results.push({
        pageId: page.id,
        pageName: page.name,
        hasInstagram: !!ig,
        instagramId: ig?.id,
        instagramUsername: ig?.username,
        instagramFollowers: ig?.followers_count,
      });

      // If channelId provided, update that channel
      if (channelId) {
        const [channel] = await db.select().from(channels).where(eq(channels.id, parseInt(channelId))).limit(1);
        
        if (channel) {
          const encrypted = encryptSecret(pageToken);
          
          if (channel.platform === "Facebook") {
            await db.update(channels)
              .set({
                accessToken: encrypted,
                platformId: page.id,
                isConnected: true,
                connectedAt: new Date(),
                tokenExpiresAt: null, // PERMANENT - no expiry!
                status: "Healthy",
              })
              .where(eq(channels.id, parseInt(channelId)));
            
            console.log(`✅ Updated Facebook channel ${channelId} with permanent token`);
          }
          
          // Also update Instagram if linked
          if (ig && channel.platform === "Instagram") {
            await db.update(channels)
              .set({
                accessToken: encrypted,
                platformId: ig.id,
                handle: `@${ig.username}`,
                followers: ig.followers_count?.toString(),
                isConnected: true,
                connectedAt: new Date(),
                tokenExpiresAt: null, // PERMANENT
                status: "Healthy",
              })
              .where(eq(channels.id, parseInt(channelId)));
            
            console.log(`✅ Updated Instagram channel ${channelId} with permanent token`);
          }
        }
      }
    }

    // Auto-update all Meta channels if no specific channelId
    if (!channelId && pages.length > 0) {
      const page = pages[0];
      const pageToken = page.access_token;
      const encrypted = encryptSecret(pageToken);
      const ig = page.instagram_business_account;

      // Update Facebook channel (ID 1)
      await db.update(channels)
        .set({
          accessToken: encrypted,
          platformId: page.id,
          isConnected: true,
          connectedAt: new Date(),
          tokenExpiresAt: null,
          status: "Healthy",
        })
        .where(eq(channels.id, 1));

      // Update Instagram channel (ID 2) if linked
      if (ig) {
        await db.update(channels)
          .set({
            accessToken: encrypted,
            platformId: ig.id,
            handle: `@${ig.username}`,
            followers: ig.followers_count?.toString(),
            isConnected: true,
            connectedAt: new Date(),
            tokenExpiresAt: null,
            status: "Healthy",
          })
          .where(eq(channels.id, 2));
      }

      console.log("✅ Auto-updated all Meta channels");
    }

    return NextResponse.json({
      success: true,
      message: "Tokens exchanged successfully! Your Page Access Token is now PERMANENT.",
      pages: results,
      tokenType: "permanent",
      expiresAt: null,
    });

  } catch (error: any) {
    console.error("Token exchange error:", error);
    return NextResponse.json({ 
      error: error.message || "Token exchange failed" 
    }, { status: 500 });
  }
}
