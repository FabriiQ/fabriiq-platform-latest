/**
 * React hooks and utilities fixes
 * 
 * This utility provides stable React hook references to prevent
 * "useEffect is not defined" errors and other React-related issues
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  useReducer,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
  memo,
  createContext,
  Fragment,
  Suspense,
  lazy
} from 'react';

// Re-export all React hooks and utilities for stable references
export {
  React,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  useReducer,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
  memo,
  createContext,
  Fragment,
  Suspense,
  lazy
};

// Create stable references to prevent HMR issues
export const StableReact = {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  useReducer,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
  memo,
  createContext,
  Fragment,
  Suspense,
  lazy
} as const;

// Default export for React
export default React;
