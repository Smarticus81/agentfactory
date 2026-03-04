import { z } from "zod";
import type { ToolConfig, AppConfig } from "./config.js";
import { executeTool } from "./sql-executor.js";

/**
 * Converts BevOne tool configs into LiveKit Agent tools
 */
export function createTools(config: AppConfig) {
  const tools: Record<string, any> = {};

  for (const tool of config.tools) {
    tools[tool.name] = createTool(tool, config);
  }

  return tools;
}

function createTool(tool: ToolConfig, config: AppConfig) {
  // Build Zod schema from parameters
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const param of tool.parameters) {
    let zodType: z.ZodTypeAny;

    switch (param.type) {
      case "number":
        zodType = z.number().describe(param.description);
        break;
      case "boolean":
        zodType = z.boolean().describe(param.description);
        break;
      case "array":
        zodType = z.array(z.any()).describe(param.description);
        break;
      default:
        zodType = z.string().describe(param.description);
    }

    if (!param.required) {
      zodType = zodType.optional();
    }

    shape[param.name] = zodType;
  }

  return {
    description: tool.description,
    parameters: z.object(shape),
    execute: async (params: Record<string, any>) => {
      try {
        const result = await executeTool(tool, params, config.connection);
        return {
          success: true,
          data: result.rows,
          message: result.formatted,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Tool failed",
        };
      }
    },
  };
}
