import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { userId, accessToken, enrollmentId, institutionName } = await req.json();

        // Use Service Role Key to bypass RLS for this internal setup
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Save to bank_connections
        const { data: connection, error: connError } = await supabase
            .from('bank_connections')
            .insert([{
                user_id: userId,
                access_token: accessToken,
                enrollment_id: enrollmentId,
                institution_name: institutionName
            }])
            .select()
            .single();

        if (connError) throw connError;

        // 2. Link this to a new Payment Method automatically
        const { error: pmError } = await supabase
            .from('payment_methods')
            .insert([{
                user_id: userId,
                name: `${institutionName} (Auto-Sync)`,
                // This links back to the bank_connection you just created
                bank_connection_id: connection.id
            }]);

        if (pmError) throw pmError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}