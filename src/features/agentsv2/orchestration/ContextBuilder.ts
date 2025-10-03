import { Agent } from './Agent';

/**
 * Builds the context for an agent's LLM call.
 * This is a placeholder implementation.
 */
export class ContextBuilder {
  async buildAgentContext(
    agent: Agent,
    userRequest: any,
    taskId: string,
    maxTokens: number = 4096
  ): Promise<any[]> {
    console.log(`Building context for agent ${agent.id}`);
    // In a real implementation, this would fetch history and construct a proper context.
    // For this placeholder, we'll return a minimal context.
    return Promise.resolve([
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: JSON.stringify(userRequest) }
    ]);
  }
}