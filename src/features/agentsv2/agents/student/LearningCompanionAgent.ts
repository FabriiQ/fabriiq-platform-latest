import { Agent, AgentState, ToolCall, Done } from '../../orchestration/Agent';
import { ChatOpenAI } from '@langchain/openai';
import { ToolRegistry } from '../../orchestration/ToolRegistry';
import { StateManager } from '../../orchestration/StateManager';
import { ContextBuilder } from '../../orchestration/ContextBuilder';
import { getStudentLearningContextTool } from '../../tools/studentTools';
import { DynamicStructuredTool } from '@langchain/core/tools';

/**
 * An agent that provides personalized academic tutoring to students using a Socratic method.
 */
export class LearningCompanionAgent extends Agent {
  id = 'learning-companion';
  name = 'Learning Companion';
  purpose = 'Personalized academic tutoring across all subjects';
  systemPrompt = `
    You are a personal learning companion for a student, specializing in Socratic teaching.
    Your primary goal is to guide students to discover answers for themselves.
    NEVER give direct answers. Instead, use the Socratic method:
    1. Ask clarifying questions to understand the student's thinking.
    2. Use scaffolding: provide small hints, then ask leading questions, then offer examples if they are still stuck.
    3. Praise effort, strategy, and progress, not just correctness.
    4. Foster a growth mindset by framing challenges as opportunities to learn.
    5. Keep your responses concise, encouraging, and age-appropriate.
    Your final response should be a message to the student, not a tool call.
  `;
  maxSteps = 4;
  tools: DynamicStructuredTool[] = [getStudentLearningContextTool];

  private llm: ChatOpenAI;

  constructor(
    toolRegistry: ToolRegistry,
    stateManager: StateManager,
    contextBuilder: ContextBuilder
  ) {
    super(toolRegistry, stateManager, contextBuilder);
    this.llm = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0.7 });
  }

  async determineNextStep(state: AgentState): Promise<ToolCall | Done> {
    const contextMessages = await this.contextBuilder.buildAgentContext(this, state.input, state.taskId);

    const llmWithTools = this.llm.bind({
        tools: this.tools,
        tool_choice: "auto",
    });

    const response = await llmWithTools.invoke(contextMessages);

    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0];
      return {
        type: 'tool_call',
        tool: toolCall.name,
        parameters: toolCall.args,
      };
    }

    return { type: 'done', result: response.content };
  }

  reducer(state: AgentState, action: { step: ToolCall, result: any }): AgentState {
    return {
      ...state,
      steps: state.steps + 1,
      messages: [
        ...state.messages,
        { role: 'assistant', tool_calls: [action.step] },
        { role: 'tool', tool_call_id: action.step.tool, name: action.step.tool, content: JSON.stringify(action.result) },
      ],
      data: {
        ...state.data,
        [action.step.tool]: action.result,
      },
    };
  }
}