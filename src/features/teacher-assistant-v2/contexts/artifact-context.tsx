'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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

interface ArtifactContextType {
  artifact: UIArtifact;
  setArtifact: React.Dispatch<React.SetStateAction<UIArtifact>>;
  metadata: any;
  setMetadata: React.Dispatch<React.SetStateAction<any>>;
  showArtifact: (newArtifact: Partial<UIArtifact>) => void;
  hideArtifact: () => void;
  updateArtifact: (updates: Partial<UIArtifact>) => void;
  resetArtifact: () => void;
  completeArtifact: () => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
}

const ArtifactContext = createContext<ArtifactContextType | null>(null);

interface ArtifactProviderProps {
  children: ReactNode;
}

export function ArtifactProvider({ children }: ArtifactProviderProps) {
  const [artifact, setArtifact] = useState<UIArtifact>(initialArtifactData);
  const [metadata, setMetadata] = useState<any>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);

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
    // Reset editing state when hiding artifact
    setIsEditing(false);
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
    setIsEditing(false);
  }, []);

  const completeArtifact = useCallback(() => {
    setArtifact(prev => ({
      ...prev,
      status: 'idle',
    }));
  }, []);

  const value = {
    artifact,
    setArtifact,
    metadata,
    setMetadata,
    showArtifact,
    hideArtifact,
    updateArtifact,
    resetArtifact,
    completeArtifact,
    isEditing,
    setIsEditing,
  };

  return (
    <ArtifactContext.Provider value={value}>
      {children}
    </ArtifactContext.Provider>
  );
}

export function useArtifact() {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error('useArtifact must be used within an ArtifactProvider');
  }
  return context;
}
