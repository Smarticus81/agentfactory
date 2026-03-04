// Voice command tools for venue POS operations
// These tools can be called by voice agents deployed at venues

export const VOICE_COMMAND_TOOLS = [
  {
    type: "function",
    function: {
      name: "pos_get_menu",
      description: "Get the venue menu. Use when staff asks about menu items, prices, or availability.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Menu category to filter by (e.g., 'drinks', 'food', 'specials')"
          },
          search: {
            type: "string",
            description: "Search term to find specific items"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pos_open_tab",
      description: "Open a new tab for a customer. Use when staff says 'open a tab', 'new tab for...', etc.",
      parameters: {
        type: "object",
        properties: {
          customerName: {
            type: "string",
            description: "Customer name for the tab"
          },
          tableNumber: {
            type: "string",
            description: "Table or seat number (optional)"
          }
        },
        required: ["customerName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pos_get_tabs",
      description: "Get all open tabs. Use when staff asks 'show open tabs', 'who has tabs open', etc.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["open", "closed", "all"],
            description: "Filter tabs by status (default: open)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pos_get_tab_detail",
      description: "Get details of a specific tab including all items. Use when staff asks about a particular tab.",
      parameters: {
        type: "object",
        properties: {
          tabId: {
            type: "string",
            description: "Tab ID or customer name to look up"
          }
        },
        required: ["tabId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pos_add_items",
      description: "Add items to a tab. Use when staff says 'add a beer to...', 'two margaritas on tab...', etc.",
      parameters: {
        type: "object",
        properties: {
          tabId: {
            type: "string",
            description: "Tab ID or customer name"
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Menu item name" },
                quantity: { type: "number", description: "Quantity (default 1)" },
                modifiers: { type: "string", description: "Special instructions or modifiers" }
              },
              required: ["name"]
            },
            description: "Items to add to the tab"
          }
        },
        required: ["tabId", "items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pos_void_item",
      description: "Void/remove an item from a tab. Use when staff needs to remove an item.",
      parameters: {
        type: "object",
        properties: {
          tabId: {
            type: "string",
            description: "Tab ID or customer name"
          },
          itemName: {
            type: "string",
            description: "Name of the item to void"
          },
          reason: {
            type: "string",
            description: "Reason for voiding"
          }
        },
        required: ["tabId", "itemName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pos_close_tab",
      description: "Close and pay a tab. ALWAYS confirm the total and payment method before closing.",
      parameters: {
        type: "object",
        properties: {
          tabId: {
            type: "string",
            description: "Tab ID or customer name"
          },
          paymentMethod: {
            type: "string",
            enum: ["cash", "credit", "debit", "gift_card", "comp"],
            description: "Payment method"
          },
          tip: {
            type: "number",
            description: "Tip amount (optional)"
          },
          splitWays: {
            type: "number",
            description: "Number of ways to split the bill (optional)"
          }
        },
        required: ["tabId", "paymentMethod"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pos_get_sales",
      description: "Get sales reports and summaries. Use when staff asks about sales, revenue, or daily totals.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["today", "yesterday", "this_week", "this_month"],
            description: "Report period"
          },
          groupBy: {
            type: "string",
            enum: ["item", "category", "hour", "server"],
            description: "How to group results"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pos_apply_discount",
      description: "Apply a discount to a tab. Use for happy hour pricing, comps, or manual discounts.",
      parameters: {
        type: "object",
        properties: {
          tabId: {
            type: "string",
            description: "Tab ID or customer name"
          },
          discountType: {
            type: "string",
            enum: ["percentage", "fixed", "comp"],
            description: "Type of discount"
          },
          amount: {
            type: "number",
            description: "Discount amount (percentage or fixed dollar amount)"
          },
          reason: {
            type: "string",
            description: "Reason for the discount"
          }
        },
        required: ["tabId", "discountType", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pos_get_inventory",
      description: "Check inventory levels. Use when staff asks about stock, 86'd items, or availability.",
      parameters: {
        type: "object",
        properties: {
          item: {
            type: "string",
            description: "Specific item to check"
          },
          lowStockOnly: {
            type: "boolean",
            description: "Only show low-stock items"
          }
        },
        required: []
      }
    }
  }
];

// Tool execution - connects to venue's configured POS backend
export const executeVoiceCommand = async (toolName: string, args: any, userId: string, agentId?: string) => {
  console.log(`Executing venue command: ${toolName}`, args);

  try {
    const response = await fetch(`/api/pos/${toolName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...args, userId, agentId })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `POS command failed: ${toolName}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || `${toolName} completed`,
      action: toolName,
      details: data
    };
  } catch (error: any) {
    console.error(`Error executing ${toolName}:`, error);
    return {
      success: false,
      error: error?.message || 'Unknown error occurred',
      action: 'command_failed'
    };
  }
};
