'use client';

import React from 'react';
import { useTellerConnect } from 'teller-connect-react';

interface Props {
    userId: string; // Pass the Supabase User ID here
}

export default function LinkBankButton({ userId }: Props) {
    const { open, ready } = useTellerConnect({
        applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID!,
        environment: 'development',
        onSuccess: async (enrollment) => {
            console.log("Teller Success:", enrollment);

            // Send the token to your backend to save it in Supabase
            const response = await fetch('/api/teller/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    accessToken: enrollment.accessToken,
                    enrollmentId: enrollment.enrollment.id,
                    institutionName: enrollment.enrollment.institution.name
                }),
            });

            if (response.ok) {
                alert(`${enrollment.enrollment.institution.name} linked successfully!`);
                window.location.reload(); // Refresh to show new transactions
            }
        },
        onExit: () => {
            console.log("User closed the Teller widget.");
        },
    });

    return (
        <button
            onClick={() => open()}
            disabled={!ready}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
        >
            {ready ? 'Link Bank Account' : 'Loading Teller...'}
        </button>
    );
}