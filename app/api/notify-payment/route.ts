import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import webpush from "web-push";

// Configure webpush with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:mauroibarra133@gmail.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function POST(req: Request) {
  try {
    const { guestName, amount, installmentNumber } = await req.json();

    if (!guestName || !amount) {
      return NextResponse.json(
        { error: "Faltan datos del pago" },
        { status: 400 }
      );
    }

    // Get all admin subscriptions from Supabase
    const { data: dbSubscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, subscription");

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return NextResponse.json(
        { error: "Error al obtener suscripciones de push" },
        { status: 500 }
      );
    }

    if (!dbSubscriptions || dbSubscriptions.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0 });
    }

    // Construct the payload
    const installmentText =
      installmentNumber === "total"
        ? "el Pago Total"
        : `la Cuota ${installmentNumber}`;
        
    const payload = JSON.stringify({
      title: "¡Nuevo pago recibido! 💰",
      body: `${guestName} pagó ${installmentText} por $${Number(amount).toLocaleString("es-AR")}.`,
    });

    const sendPromises = dbSubscriptions.map(async (row) => {
      try {
        const pushSubscription = row.subscription as unknown as webpush.PushSubscription;
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: any) {
        console.error(
          `Failed to send push notification to subscription ID ${row.id}:`,
          err
        );
        // If the subscription is expired or inactive (status 410 or 404), remove it from the DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", row.id);
          console.log(`Pruned expired push subscription: ${row.id}`);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({
      success: true,
      sentCount: dbSubscriptions.length,
    });
  } catch (error: any) {
    console.error("Error in notify-payment route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
