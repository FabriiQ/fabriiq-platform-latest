import { PrismaClient } from '@prisma/client';
import { DynamicStructuredTool } from '@langchain/core/tools';

const prisma = new PrismaClient();

export interface ExecutionContext {
  userId: string;
  taskId: string;
}

/**
 * Manages the registration and execution of tools available to agents.
 * It now works directly with LangChain's DynamicStructuredTool.
 */
export class ToolRegistry {
  private tools: Map<string, DynamicStructuredTool> = new Map();

  /**
   * Registers a new tool.
   * @param tool The tool to register.
   */
  registerTool(tool: DynamicStructuredTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Executes a tool with the given parameters.
   * @param toolName The name of the tool to execute.
   * @param parameters The parameters for the tool.
   * @param context The execution context for logging purposes.
   * @returns The result of the tool execution.
   */
  async executeTool(
    toolName: string,
    parameters: any,
    context: ExecutionContext
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const validatedParams = await tool.schema.parseAsync(parameters);
    const startTime = Date.now();

    try {
      const result = await tool.func(validatedParams);
      const duration = Date.now() - startTime;

      await prisma.toolExecution.create({
        data: {
          taskId: context.taskId,
          toolName,
          parameters: validatedParams,
          result: { output: result },
          durationMs: duration,
        },
      });

      return result;
    } catch (error: any) {
      const compactError = this.compactError(error);
      await prisma.toolExecution.create({
        data: {
          taskId: context.taskId,
          toolName,
          parameters: validatedParams,
          error: compactError,
        },
      });

      return {
        error: true,
        message: compactError,
        type: error.constructor.name,
      };
    }
  }

  /**
   * Compacts an error object to a string for logging.
   * @param error The error to compact.
   * @returns A string representation of the error.
   */
  private compactError(error: Error): string {
    return JSON.stringify({
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 2).join('\n'),
    });
  }
}