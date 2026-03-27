import { useEffect, useState, useCallback } from 'react';

interface TellerOptions {
    applicationId: string;
    environment: 'sandbox' | 'development' | 'production';
    onSuccess: (enrollment: any) => void;
    onExit?: () => void;
}

export function useTellerConnect(options: TellerOptions) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // 1. Load the Teller script if it's not already there
        if (!document.querySelector('script[src="https://cdn.teller.io/connect/connect.js"]')) {
            const script = document.createElement('script');
            script.src = "https://cdn.teller.io/connect/connect.js";
            script.async = true;
            script.onload = () => setReady(true);
            document.body.appendChild(script);
        } else {
            setReady(true);
        }
    }, []);

    const open = useCallback(() => {
        if (!ready || !(window as any).TellerConnect) return;

        const teller = (window as any).TellerConnect.setup({
            applicationId: options.applicationId,
            environment: options.environment,
            onSuccess: options.onSuccess,
            onExit: options.onExit,
        });

        teller.open();
    }, [ready, options]);

    return { open, ready };
}