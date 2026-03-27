import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken, enrollmentId, institutionName } = body;

    if (!accessToken || !enrollmentId) {
      return NextResponse.json(
        { error: "Missing required token or enrollment id properties" },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration context.");
    }

    // Initialize authenticated backend Supabase client hitting service_role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const userId = process.env.TELLER_DEFAULT_USER_ID;

    if (!userId) {
      console.error("No TELLER_DEFAULT_USER_ID environment variable set to map tokens towards.");
      return NextResponse.json(
        { error: "Configuration Error: Default User ID not mapped in environment." },
        { status: 500 }
      );
    }

    // Securely upsert the Teller connection token into the database mapping table.
    // If the table 'teller_connections' doesn't exist yet, this will error in console dynamically highlighting the required schema constraint to user.
    const { error: insertError } = await supabase
      .from("teller_connections")
      .upsert({
        user_id: userId,
        enrollment_id: enrollmentId,
        access_token: accessToken,
        institution_name: institutionName || "Unknown Bank",
        status: "active",
        created_at: new Date().toISOString()
      }, { onConflict: "enrollment_id" });

    if (insertError) {
      console.error(`Supabase persistence error for token sync:`, insertError.message);
      // Fallback response explicitly notifying the UI side that the table structure likely doesn't exist
      if (insertError.code === "42P01") {
         return NextResponse.json(
          { error: "Missing teller_connections table. Please create it in your Supabase Dashboard." },
          { status: 500 }
        );
      }
      throw new Error("Persisting token failed");
    }

    console.log(`Successfully stored Teller access token for enrollment: ${enrollmentId}`);
    return NextResponse.json({ success: true, message: "Token stored securely." }, { status: 200 });

  } catch (error) {
    console.error("Enrollment hand-off processing failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error during token exchange" },
      { status: 500 }
    );
  }
}
