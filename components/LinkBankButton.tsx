'use client';

import React from 'react';
import { useTellerConnect } from '@/hooks/useTellerConnect'; // Point to your local file

interface Props {
    userId: string;
}

export default function LinkBankButton({ userId }: Props) {
    const { open, ready } = useTellerConnect({
        applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID!,
        environment: 'development',
        onSuccess: async (enrollment) => {
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
                window.location.reload();
            }
        },
    });

    return (
        <button
            onClick={() => open()}
            disabled={!ready}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
        >
            {ready ? 'Link Bank Account' : 'Loading Teller...'}
        </button>
    );
}