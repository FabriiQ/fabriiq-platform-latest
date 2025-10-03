import { z } from 'zod';
import { ToolRegistry } from './ToolRegistry';
import { StateManager } from './StateManager';
import { ContextBuilder } from './ContextBuilder';
import { DynamicStructuredTool } from '@langchain/core/tools';

// Define the structure of a tool call
export interface ToolCall {
  type: 'tool_call';
  tool: string;
  parameters: any;
}

// Define the structure when an agent is done
export interface Done {
  type: 'done';
  result: any;
}

// Define the state of an agent during execution
export interface AgentState {
  taskId: string;
  userId: string;
  input: any;
  messages: any[];
  steps: number;
  data: any;
}

// Define the result of an agent's execution
export interface AgentResult {
  status: 'completed' | 'incomplete' | 'paused';
  result?: any;
  steps?: number;
  reason?: string;
  state?: string;
}

/**
 * Abstract class representing the base for all agents.
 * It defines the core control flow and structure that agents will follow.
 */
export abstract class Agent {
  abstract id: string;
  abstract name: string;
  abstract purpose: string;
  abstract systemPrompt: string;
  abstract tools: DynamicStructuredTool[];
  abstract maxSteps: number;

  protected toolRegistry: ToolRegistry;
  protected stateManager: StateManager;
  protected contextBuilder: ContextBuilder;

  constructor(
    toolRegistry: ToolRegistry,
    stateManager: StateManager,
    contextBuilder: ContextBuilder
  ) {
    this.toolRegistry = toolRegistry;
    this.stateManager = stateManager;
    this.contextBuilder = contextBuilder;
  }

  /**
   * Determines the next step for the agent to take based on the current context.
   * This would typically involve a call to an LLM.
   * @param context The current agent context.
   * @returns A promise that resolves to either a tool call or a done state.
   */
  abstract determineNextStep(state: AgentState): Promise<ToolCall | Done>;

  /**
   * A pure function that updates the agent's state based on the result of a tool execution.
   * @param state The current state of the agent.
   * @param action The result of the tool execution.
   * @returns The new state of the agent.
   */
  abstract reducer(state: AgentState, action: { step: ToolCall, result: any }): AgentState;

  /**
   * Executes the main logic of the agent.
   * This method orchestrates the agent's lifecycle, from determining the next step to executing tools.
   * @param initialState The initial state of the agent.
   * @returns A promise that resolves to the result of the agent's execution.
   */
  async execute(initialState: AgentState): Promise<AgentResult> {
    let state = { ...initialState };

    for (let i = 0; i < this.maxSteps; i++) {
      const nextStep = await this.determineNextStep(state);

      if (nextStep.type === 'done') {
        await this.stateManager.completeTask(state.taskId, nextStep.result);
        return { status: 'completed', result: nextStep.result, steps: state.steps };
      }

      const toolResult = await this.toolRegistry.executeTool(
        nextStep.tool,
        nextStep.parameters,
        { userId: state.userId, taskId: state.taskId }
      );

      state = this.reducer(state, { step: nextStep, result: toolResult });
      await this.stateManager.updateState(state.taskId, state);
    }

    const finalState: AgentResult = { status: 'incomplete', reason: 'max_steps_exceeded', steps: state.steps };
    await this.stateManager.failTask(state.taskId, finalState);
    return finalState;
  }
}