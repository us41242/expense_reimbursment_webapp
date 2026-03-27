'use client';

import React, { useState } from 'react';

export default function SyncButton() {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            // This calls your existing app/api/teller/sync/route.ts
            const res = await fetch('/api/teller/sync');
            const data = await res.json();

            if (res.ok) {
                alert(data.message || "Sync successful!");
                // Force a page refresh so the DashboardClient sees the new data in Supabase
                window.location.reload();
            } else {
                alert("Sync failed: " + (data.error || "Check server logs"));
            }
        } catch (err) {
            console.error("Sync error:", err);
            alert("Could not reach the sync API.");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
        >
            {isSyncing ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                </>
            ) : (
                'Refresh Transactions'
            )}
        </button>
    );
}