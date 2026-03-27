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
        const TELLER_SCRIPT_URL = 'https://cdn.teller.io/connect/connect.js';

        const markReady = () => {
            if ((window as any).TellerConnect) {
                setReady(true);
            } else {
                // Script tag loaded but TellerConnect global isn't set yet — poll briefly
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    if ((window as any).TellerConnect) {
                        clearInterval(interval);
                        setReady(true);
                    } else if (attempts > 20) {
                        clearInterval(interval);
                        console.error('[TellerConnect] Script loaded but window.TellerConnect is not defined after 2s. Check your app ID and network.');
                    }
                }, 100);
            }
        };

        const existing = document.querySelector(`script[src="${TELLER_SCRIPT_URL}"]`);
        if (!existing) {
            const script = document.createElement('script');
            script.src = TELLER_SCRIPT_URL;
            script.async = true;
            script.onload = markReady;
            script.onerror = () => console.error('[TellerConnect] Failed to load connect.js from CDN.');
            document.body.appendChild(script);
        } else {
            // Script tag already present — still need to confirm the global is ready
            markReady();
        }
    }, []);

    const open = useCallback(() => {
        if (!ready) {
            console.warn('[TellerConnect] open() called before ready');
            return;
        }
        if (!(window as any).TellerConnect) {
            console.error('[TellerConnect] window.TellerConnect is not defined. The script may have failed to load.');
            return;
        }

        try {
            const teller = (window as any).TellerConnect.setup({
                applicationId: options.applicationId,
                environment: options.environment,
                onSuccess: options.onSuccess,
                onExit: options.onExit ?? (() => {}),
            });
            teller.open();
        } catch (err) {
            console.error('[TellerConnect] Error calling setup/open:', err);
        }
    }, [ready, options]);

    return { open, ready };
}