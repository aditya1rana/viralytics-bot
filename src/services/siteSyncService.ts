export async function syncEventToSite(event: string, payload: any) {
  try {
    const baseUrl = process.env.INSTAFLOW_SITE_URL || "https://instaflow.online";
    const secret = process.env.BOT_SYNC_SECRET || "viralytics_bot_secret_key_2026";
    
    const response = await fetch(`${baseUrl}/api/bot/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": secret,
      },
      body: JSON.stringify({ event, payload }),
    });

    if (!response.ok) {
      console.warn(`[SiteSync] Server returned ${response.status} for event ${event}`);
    } else {
      console.log(`[SiteSync] Successfully synced ${event} to ${baseUrl}`);
    }
  } catch (err: any) {
    console.error(`[SiteSync] Error syncing ${event} to website:`, err?.message || err);
  }
}
