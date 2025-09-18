import { useEffect, useRef } from 'react';

export default function usePolling(callback, delay = 2000) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return undefined;
    }
    const tick = () => {
      savedCallback.current?.();
    };
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
