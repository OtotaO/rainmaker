// START: [HOOKS-01]
import { useEffect, useRef } from 'react';

export const useAutoResizeTextArea = (value: string) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return ref;
};
// END: [HOOKS-01]