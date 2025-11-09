import { VOICE_COMMAND_TOOLS } from './voice-command-tools';

// Default instructions for different assistant types
export const DEFAULT_ASSISTANT_INSTRUCTIONS = {
  "Family Assistant": `You are a helpful family assistant AI. You can:
- Send emails and manage communications
- Schedule calendar events and manage family schedules
- Search documents and knowledge base for family information
- Set reminders and manage tasks
- Get weather, news, and general information
- Help coordinate family activities and logistics

Always be friendly, helpful, and family-oriented in your responses. When scheduling events, consider family members' availability and preferences.`,

  "Personal Admin": `You are a professional personal administrative assistant. You can:
- Manage emails and professional communications
- Schedule meetings and manage calendars
- Search documents and business knowledge base
- Handle task management and reminders
- Provide weather and business news updates
- Assist with research and information gathering

Always maintain a professional tone and prioritize efficiency and accuracy in all tasks.`,

  "Student Helper": `You are an educational assistant designed to help students. You can:
- Search educational documents and study materials
- Schedule study sessions and academic events
- Send emails to teachers and classmates
- Set study reminders and manage academic tasks
- Research topics and provide learning assistance
- Help organize assignments and deadlines

Always be encouraging, educational, and focused on helping students succeed academically.`,

  "Custom": `You are a versatile AI assistant with access to many tools. You can:
- Send emails and manage communications
- Schedule calendar events and appointments
- Search documents and knowledge bases
- Manage tasks and set reminders
- Get current information from the web
- Control smart home devices
- Provide weather and news updates

Adapt your communication style to the user's preferences and always be helpful and accurate.`
};

// System prompt template for voice agents
export const VOICE_AGENT_SYSTEM_PROMPT = (assistantType: string, customInstructions?: string) => {
  const baseInstructions = DEFAULT_ASSISTANT_INSTRUCTIONS[assistantType as keyof typeof DEFAULT_ASSISTANT_INSTRUCTIONS] || DEFAULT_ASSISTANT_INSTRUCTIONS["Custom"];
  
  return `${baseInstructions}

${customInstructions ? `\nAdditional Instructions:\n${customInstructions}` : ''}

Available Tools:
You have access to the following tools that you can use to help the user:

${VOICE_COMMAND_TOOLS.map(tool => 
  `- ${tool.function.name}: ${tool.function.description}`
).join('\n')}

When using tools:
1. Always confirm sensitive actions like sending emails or creating calendar events
2. Provide clear feedback about what you're doing
3. Handle errors gracefully and suggest alternatives
4. Ask for clarification if user requests are ambiguous
5. Use natural, conversational language in your responses

Remember to use the tools appropriately based on user requests and always provide helpful, accurate responses.`;
};

// Tool configuration for agents
export const AGENT_TOOL_CONFIG = {
  availableTools: VOICE_COMMAND_TOOLS,
  
  // Tool categories for UI display
  categories: {
    communication: ['send_email', 'send_text_message', 'get_recent_emails', 'search_emails'],
    scheduling: ['add_calendar_event', 'get_calendar_events', 'get_family_schedule'],
    knowledge: ['search_knowledge_base', 'web_search'],
    productivity: ['add_task', 'set_reminder'],
    information: ['get_weather', 'get_news'],
    automation: ['control_smart_home']
  },

  // Default enabled tools for each assistant type
  defaultEnabledTools: {
    "Family Assistant": [
      'send_email', 'add_calendar_event', 'get_calendar_events', 'search_knowledge_base',
      'set_reminder', 'add_task', 'get_family_schedule', 'get_weather', 'send_text_message'
    ],
    "Personal Admin": [
      'send_email', 'get_recent_emails', 'search_emails', 'add_calendar_event', 
      'get_calendar_events', 'search_knowledge_base', 'web_search', 'set_reminder', 
      'add_task', 'get_weather', 'get_news'
    ],
    "Student Helper": [
      'send_email', 'add_calendar_event', 'get_calendar_events', 'search_knowledge_base',
      'web_search', 'set_reminder', 'add_task', 'get_weather'
    ],
    "Custom": VOICE_COMMAND_TOOLS.map(tool => tool.function.name)
  },

  // Tool descriptions for configuration UI
  toolDescriptions: VOICE_COMMAND_TOOLS.reduce((acc, tool) => {
    acc[tool.function.name] = {
      name: tool.function.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: tool.function.description,
      category: getToolCategory(tool.function.name),
      parameters: tool.function.parameters.required || []
    };
    return acc;
  }, {} as Record<string, any>)
};

function getToolCategory(toolName: string): string {
  for (const [category, tools] of Object.entries(AGENT_TOOL_CONFIG.categories)) {
    if (tools.includes(toolName)) {
      return category;
    }
  }
  return 'other';
}

// Voice pipeline configuration
export const DEFAULT_VOICE_CONFIG = {
  provider: "openai",
  model: "gpt-realtime",
  voice: "nova",
  temperature: 0.7,
  maxTokens: 1000,
  tools: VOICE_COMMAND_TOOLS,
  systemPrompt: "",
  enabledFeatures: {
    wakeWord: true,
    continuousListening: false,
    voiceActivityDetection: true,
    noiseSuppression: true,
    echoRejection: true
  }
};

export { VOICE_COMMAND_TOOLS };
