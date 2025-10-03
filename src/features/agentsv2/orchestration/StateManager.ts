import { PrismaClient } from '@prisma/client';
import { AgentState } from './Agent';

const prisma = new PrismaClient();

/**
 * Manages the state of agent tasks, including creating, pausing, and resuming them.
 * It interacts with the database to persist the state of each task.
 */
export class StateManager {
  /**
   * Launches a new agent task and stores its initial state in the database.
   * @param agentId The ID of the agent to launch.
   * @param userId The ID of the user launching the agent.
   * @param input The input for the agent task.
   * @param maxSteps The maximum number of steps the agent can take.
   * @returns The ID of the newly created task.
   */
  async launchAgent(
    agentId: string,
    userId: string,
    userRole: string,
    input: any,
    maxSteps: number
  ): Promise<string> {
    const task = await prisma.agentTask.create({
      data: {
        agentId,
        userId,
        userRole,
        input,
        maxSteps,
        status: 'running',
        state: {
          messages: [],
          steps: 0,
          data: {},
        },
      },
    });
    return task.id;
  }

  /**
   * Pauses an agent task.
   * @param taskId The ID of the task to pause.
   */
  async pauseAgent(taskId: string): Promise<void> {
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'paused' },
    });
  }

  /**
   * Resumes a paused agent task.
   * @param taskId The ID of the task to resume.
   * @returns The state of the agent task before it was resumed.
   */
  async resumeAgent(taskId: string): Promise<AgentState | null> {
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId },
    });

    if (!task || task.status !== 'paused') {
      return null;
    }

    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'running' },
    });

    return task.state as unknown as AgentState;
  }

  /**
   * Updates the state of an agent task.
   * @param taskId The ID of the task to update.
   * @param state The new state of the task.
   */
  async updateState(taskId: string, state: AgentState): Promise<void> {
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { state: state as any },
    });
  }

  /**
   * Marks an agent task as complete.
   * @param taskId The ID of the task to complete.
   * @param result The result of the task.
   */
  async completeTask(taskId: string, result: any): Promise<void> {
    await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        result: result as any,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Marks an agent task as failed.
   * @param taskId The ID of the task to fail.
   * @param error The error that caused the failure.
   */
  async failTask(taskId: string, error: any): Promise<void> {
    await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        error: JSON.stringify(error),
      },
    });
  }
}