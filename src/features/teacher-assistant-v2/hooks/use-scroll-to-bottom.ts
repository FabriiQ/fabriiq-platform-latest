'use client';

import { useCallback, useRef, useState } from 'react';

export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const onViewportEnter = useCallback(() => {
    setIsAtBottom(true);
  }, []);

  const onViewportLeave = useCallback(() => {
    setIsAtBottom(false);
  }, []);

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    onViewportEnter,
    onViewportLeave,
  };
}
