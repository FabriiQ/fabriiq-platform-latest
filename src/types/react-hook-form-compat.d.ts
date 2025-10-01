// Temporary compatibility shim for TypeScript complaining about useFieldArray.
// The runtime export exists in react-hook-form v7+, so this just helps the TS server.

declare module 'react-hook-form' {
  export const useFieldArray: any;
}

