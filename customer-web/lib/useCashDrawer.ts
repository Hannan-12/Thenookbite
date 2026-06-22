'use client';

import { useCallback, useRef, useState } from 'react';

// ESC/POS cash drawer kick command: ESC p <pin> <on-time> <off-time>
// Works for pin 2 (most common drawer connector)
const DRAWER_PULSE = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);

export type DrawerStatus = 'idle' | 'opened' | 'error' | 'no-serial';

export function useCashDrawer() {
  const portRef  = useRef<SerialPort | null>(null);
  const [status, setStatus] = useState<DrawerStatus>('idle');
  const [paired,  setPaired]  = useState(false);

  const pairPrinter = useCallback(async (): Promise<boolean> => {
    if (!('serial' in navigator)) {
      setStatus('no-serial');
      return false;
    }
    try {
      const port = await (navigator as Navigator & { serial: { requestPort(): Promise<SerialPort> } }).serial.requestPort();
      portRef.current = port;
      setPaired(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const openDrawer = useCallback(async () => {
    // Try Web Serial if a port is paired
    if (portRef.current) {
      try {
        const port = portRef.current;
        if (port.readable === null) {
          await port.open({ baudRate: 9600 });
        }
        const writer = port.writable?.getWriter();
        if (writer) {
          await writer.write(DRAWER_PULSE);
          writer.releaseLock();
          setStatus('opened');
          setTimeout(() => setStatus('idle'), 2500);
          return;
        }
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 2500);
        return;
      }
    }

    // Fallback: no paired printer → just show visual notification
    setStatus('opened');
    setTimeout(() => setStatus('idle'), 2500);
  }, []);

  return { openDrawer, pairPrinter, paired, status };
}
