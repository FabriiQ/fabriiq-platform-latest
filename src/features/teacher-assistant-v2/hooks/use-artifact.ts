'use client';

import { useState, useCallback } from 'react';
import type { UIArtifact } from '../lib/types';

export const initialArtifactData: UIArtifact = {
  title: '',
  documentId: 'init',
  kind: 'text',
  content: '',
  isVisible: false,
  status: 'idle',
  boundingBox: {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  },
};

export function useArtifact() {
  const [artifact, setArtifact] = useState<UIArtifact>(initialArtifactData);
  const [metadata, setMetadata] = useState<any>({});

  const showArtifact = useCallback((newArtifact: Partial<UIArtifact>) => {
    setArtifact(prev => ({
      ...prev,
      ...newArtifact,
      isVisible: true,
    }));
  }, []);

  const hideArtifact = useCallback(() => {
    setArtifact(prev => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  const updateArtifact = useCallback((updates: Partial<UIArtifact>) => {
    setArtifact(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const resetArtifact = useCallback(() => {
    setArtifact(initialArtifactData);
    setMetadata({});
  }, []);

  return {
    artifact,
    setArtifact,
    metadata,
    setMetadata,
    showArtifact,
    hideArtifact,
    updateArtifact,
    resetArtifact,
  };
}
