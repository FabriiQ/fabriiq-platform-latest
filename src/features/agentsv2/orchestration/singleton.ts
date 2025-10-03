import { AIVYOrchestrator } from './AIVYOrchestrator';

/**
 * A singleton instance of the AIVYOrchestrator to be shared across the application.
 * This ensures that all components are using the same configured instance.
 */
export const aivyOrchestrator = new AIVYOrchestrator();