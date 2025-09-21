import { useEffect, useRef } from 'react';

export function useInterval(callback, delay) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return undefined;
    const id = setInterval(() => savedCallback.current?.(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
