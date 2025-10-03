import { InputValidator } from '../security/InputValidator';
import { IntentRouter } from './IntentRouter';
import { StateManager } from './StateManager';
import { Agent } from './Agent';
import { ToolRegistry } from './ToolRegistry';
import { ContextBuilder } from './ContextBuilder';
import { LearningCompanionAgent } from '../agents/student/LearningCompanionAgent';
import { AssignmentGuideAgent } from '../agents/student/AssignmentGuideAgent';
import { HumanMessage } from '@langchain/core/messages';
import { getStudentLearningContextTool, getAssignmentContextTool } from '../tools/studentTools';

/**
 * The main orchestrator for the AIVY 2.0 agent system.
 * It ties together all the core components to handle user requests,
 * manage agent lifecycles, and ensure security.
 */
export class AIVYOrchestrator {
  private inputValidator: InputValidator;
  private intentRouter: IntentRouter;
  private stateManager: StateManager;
  private toolRegistry: ToolRegistry;
  private contextBuilder: ContextBuilder;
  private agents: Map<string, Agent> = new Map();

  constructor() {
    this.inputValidator = new InputValidator();
    this.intentRouter = new IntentRouter();
    this.stateManager = new StateManager();
    this.toolRegistry = new ToolRegistry();
    this.contextBuilder = new ContextBuilder();

    // Register tools
    this.toolRegistry.registerTool(getStudentLearningContextTool);
    this.toolRegistry.registerTool(getAssignmentContextTool);

    // Register agents and inject dependencies
    this.registerAgent(new LearningCompanionAgent(this.toolRegistry, this.stateManager, this.contextBuilder));
    this.registerAgent(new AssignmentGuideAgent(this.toolRegistry, this.stateManager, this.contextBuilder));
  }

  /**
   * Registers an agent with the orchestrator.
   * @param agent The agent to register.
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * The main entry point for handling a user request.
   * It validates the input, classifies intent, and launches the appropriate agent.
   * @param request The user request details.
   * @returns The ID of the task created to handle the request.
   */
  async handleRequest(request: {
    userId: string;
    userRole: 'teacher' | 'student';
    message: string;
    input: any;
  }): Promise<{ taskId: string }> {
    // 1. Validate user input for security threats
    const validationResult = this.inputValidator.validate(request.message);
    if (!validationResult.valid || !validationResult.sanitized) {
      throw new Error(validationResult.reason || 'Invalid input.');
    }
    const sanitizedMessage = validationResult.sanitized;

    // 2. Classify intent to determine which agent to use
    const { intent } = await this.intentRouter.classifyIntent(
      sanitizedMessage,
      request.userRole
    );

    const agent = this.getAgentForIntent(intent);
    if (!agent) {
      throw new Error(`No agent found for intent: ${intent}`);
    }

    // 3. Launch the agent task in the database
    const taskId = await this.stateManager.launchAgent(
      agent.id,
      request.userId,
      request.userRole,
      { ...request.input, initialMessage: sanitizedMessage },
      agent.maxSteps
    );

    // 4. Asynchronously execute the agent. This runs in the background.
    agent.execute({
      taskId,
      userId: request.userId,
      input: { ...request.input, initialMessage: sanitizedMessage },
      messages: [new HumanMessage(sanitizedMessage)],
      steps: 0,
      data: {},
    }).catch(error => {
      console.error(`Unhandled agent execution error for task ${taskId}:`, error);
      this.stateManager.failTask(taskId, { message: 'Agent execution failed unexpectedly.', error: error.message });
    });


    return { taskId };
  }

  /**
   * Retrieves the agent associated with a given intent.
   * @param intent The intent string.
   * @returns The corresponding agent or null if not found.
   */
  private getAgentForIntent(intent: string): Agent | null {
    const intentToAgentMap: { [key: string]: string } = {
      create_curriculum: 'curriculum-architect',
      grade_assignment: 'assignment-grader',
      generate_content: 'content-studio',
      get_tutoring: 'learning-companion',
      help_assignment: 'assignment-guide',
      generate_insights: 'insight-engine',
    };
    const agentId = intentToAgentMap[intent];
    return this.agents.get(agentId) || null;
  }
}