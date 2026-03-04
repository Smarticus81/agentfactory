import { VOICE_COMMAND_TOOLS } from './voice-command-tools';

export const DEFAULT_ASSISTANT_INSTRUCTIONS = {
  "Restaurant": `You are a voice assistant for a restaurant venue. You can:
- Look up the menu and answer questions about dishes, ingredients, and prices
- Open and manage customer tabs
- Add items to tabs and process orders
- Void items and handle modifications
- Close tabs and process payments
- Pull up sales reports and daily summaries

Always be professional, efficient, and accurate with orders. Confirm items before adding and always state totals clearly.`,

  "Bar & Lounge": `You are a voice assistant for a bar and lounge. You can:
- Look up drink menus, cocktails, and specials
- Open and manage customer tabs
- Add drinks and food items to tabs
- Handle tab transfers between staff
- Close tabs and process payments
- Track inventory and popular items

Keep responses short and efficient - bartenders are busy. Confirm drink orders and state running totals.`,

  "Nightclub": `You are a voice assistant for a nightclub venue. You can:
- Manage bottle service and VIP table tabs
- Look up drink menus and bottle prices
- Open and manage customer tabs
- Process high-volume orders quickly
- Handle cover charges and entry fees
- Close tabs and process payments

Speed is critical. Keep responses brief. Confirm large orders and always state totals clearly.`,

  "Event Venue": `You are a voice assistant for an event venue. You can:
- Manage concession and bar tabs for events
- Look up venue menus and pricing
- Open and manage customer tabs
- Handle event-specific pricing and packages
- Process bulk orders for catering
- Close tabs and generate event summaries

Be adaptable to different event types. Confirm orders clearly and handle high-volume periods efficiently.`,

  "Custom": `You are a versatile voice assistant for a venue. You can:
- Look up menus, pricing, and availability
- Open and manage customer tabs
- Add items and process orders
- Void items and handle modifications
- Close tabs and process payments
- Generate reports and summaries

Adapt your communication style to the venue's needs. Always be accurate with orders and payments.`
};

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
1. ALWAYS confirm before closing tabs or processing payments
2. State the updated total after adding or voiding items
3. Use exact menu item names - ask for clarification if ambiguous
4. Keep responses SHORT - staff are busy
5. Handle errors gracefully and suggest alternatives`;
};

export const AGENT_TOOL_CONFIG = {
  availableTools: VOICE_COMMAND_TOOLS,

  categories: {
    ordering: ['pos_get_menu', 'pos_add_items', 'pos_void_item'],
    tabs: ['pos_open_tab', 'pos_get_tabs', 'pos_get_tab_detail', 'pos_close_tab'],
    payments: ['pos_close_tab', 'pos_apply_discount'],
    reporting: ['pos_get_sales', 'pos_get_inventory'],
  },

  defaultEnabledTools: {
    "Restaurant": [
      'pos_get_menu', 'pos_open_tab', 'pos_get_tabs', 'pos_get_tab_detail',
      'pos_add_items', 'pos_void_item', 'pos_close_tab', 'pos_get_sales'
    ],
    "Bar & Lounge": [
      'pos_get_menu', 'pos_open_tab', 'pos_get_tabs', 'pos_get_tab_detail',
      'pos_add_items', 'pos_void_item', 'pos_close_tab', 'pos_get_sales'
    ],
    "Nightclub": [
      'pos_get_menu', 'pos_open_tab', 'pos_get_tabs', 'pos_get_tab_detail',
      'pos_add_items', 'pos_void_item', 'pos_close_tab', 'pos_get_sales'
    ],
    "Event Venue": [
      'pos_get_menu', 'pos_open_tab', 'pos_get_tabs', 'pos_get_tab_detail',
      'pos_add_items', 'pos_void_item', 'pos_close_tab', 'pos_get_sales'
    ],
    "Custom": VOICE_COMMAND_TOOLS.map(tool => tool.function.name)
  },

  toolDescriptions: VOICE_COMMAND_TOOLS.reduce((acc, tool) => {
    acc[tool.function.name] = {
      name: tool.function.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: tool.function.description,
    };
    return acc;
  }, {} as Record<string, any>)
};

export const DEFAULT_VOICE_CONFIG = {
  provider: "openai",
  model: "gpt-4o-mini",
  voice: "alloy",
  temperature: 0.7,
  maxTokens: 1000,
  tools: VOICE_COMMAND_TOOLS,
  systemPrompt: "",
  enabledFeatures: {
    wakeWord: false,
    continuousListening: true,
    voiceActivityDetection: true,
    noiseSuppression: true,
    echoRejection: true
  }
};

export { VOICE_COMMAND_TOOLS };
