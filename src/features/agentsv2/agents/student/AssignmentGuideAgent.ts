import { Agent, AgentState, ToolCall, Done } from '../../orchestration/Agent';
import { ChatOpenAI } from '@langchain/openai';
import { ToolRegistry } from '../../orchestration/ToolRegistry';
import { StateManager } from '../../orchestration/StateManager';
import { ContextBuilder } from '../../orchestration/ContextBuilder';
import { getAssignmentContextTool } from '../../tools/studentTools';
import { DynamicStructuredTool } from '@langchain/core/tools';

/**
 * An agent that helps students understand and complete assignments by providing guidance, not answers.
 */
export class AssignmentGuideAgent extends Agent {
  id = 'assignment-guide';
  name = 'Assignment Guide';
  purpose = 'Help students understand and complete assignments';
  systemPrompt = `
    You are an assignment completion guide for students. Your core principle is to GUIDE, DON'T SOLVE.
    Your role is to:
    1. Help students understand what is being asked in an assignment.
    2. Break down complex assignments into manageable steps.
    3. Suggest strategies and approaches, but never provide the final solution.
    4. Point to relevant learning resources if available.
    5. Always end your response with a question to check the student's understanding and encourage them to think for themselves.
  `;
  maxSteps = 3;
  tools: DynamicStructuredTool[] = [getAssignmentContextTool];

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