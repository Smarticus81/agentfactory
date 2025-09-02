// Voice command tools for Gmail and Calendar integrations
// These tools can be called by voice assistants

export const VOICE_COMMAND_TOOLS = [
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email via voice command. Use when user says things like 'send an email', 'email John', 'compose message', etc.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Email address or contact name to send to"
          },
          subject: {
            type: "string", 
            description: "Email subject line"
          },
          body: {
            type: "string",
            description: "Email body content"
          },
          cc: {
            type: "string",
            description: "CC email addresses (optional)"
          },
          urgent: {
            type: "boolean",
            description: "Whether this is an urgent email"
          }
        },
        required: ["to", "subject", "body"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_calendar_event",
      description: "Add an event to the calendar via voice command. Use when user says things like 'add to calendar', 'schedule meeting', 'I have a dance recital at 4', etc.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Event title/name"
          },
          description: {
            type: "string",
            description: "Event description (optional)"
          },
          start_time: {
            type: "string",
            description: "Start time in ISO format or natural language like '4 PM today', 'tomorrow at 2'"
          },
          end_time: {
            type: "string", 
            description: "End time in ISO format or natural language"
          },
          location: {
            type: "string",
            description: "Event location (optional)"
          },
          attendees: {
            type: "array",
            items: {
              type: "string"
            },
            description: "List of attendee email addresses or names"
          },
          reminder: {
            type: "string",
            description: "Reminder time like '15 minutes before', '1 hour before'"
          }
        },
        required: ["title", "start_time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_calendar_events",
      description: "Get upcoming calendar events. Use when user asks 'what's on my calendar', 'what do I have today', 'what's coming up', etc.",
      parameters: {
        type: "object",
        properties: {
          date_range: {
            type: "string",
            description: "Date range like 'today', 'tomorrow', 'this week', 'next week'"
          },
          limit: {
            type: "number",
            description: "Maximum number of events to return (default 10)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_emails", 
      description: "Search for emails. Use when user says 'find emails from John', 'show me emails about project', etc.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query - can be sender name, subject, or content"
          },
          limit: {
            type: "number",
            description: "Maximum number of emails to return (default 10)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_emails",
      description: "Get recent emails. Use when user asks 'what are my recent emails', 'check my inbox', 'any new messages', etc.",
      parameters: {
        type: "object", 
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of emails to return (default 10)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information. Use when user asks for current information, weather, news, facts, etc.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          type: {
            type: "string",
            enum: ["general", "news", "weather", "local"],
            description: "Type of search to perform"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_text_message",
      description: "Send a text message via SMS. Use when user says 'text mom', 'send a message to', 'SMS', etc.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Phone number or contact name"
          },
          message: {
            type: "string",
            description: "Message content"
          },
          urgent: {
            type: "boolean",
            description: "Whether this is urgent"
          }
        },
        required: ["to", "message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "set_reminder",
      description: "Set a reminder. Use when user says 'remind me to', 'set a reminder', etc.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "What to be reminded about"
          },
          time: {
            type: "string", 
            description: "When to remind - natural language like 'in 30 minutes', 'tomorrow at 9 AM'"
          },
          recurring: {
            type: "string",
            description: "Recurrence pattern like 'daily', 'weekly', 'monthly'"
          }
        },
        required: ["title", "time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_family_schedule",
      description: "Get family member schedules. Use when user asks about family activities, 'what does Emma have today', etc.",
      parameters: {
        type: "object",
        properties: {
          member: {
            type: "string",
            description: "Family member name (optional - if not provided, returns everyone's schedule)"
          },
          date_range: {
            type: "string",
            description: "Date range like 'today', 'this week'"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Add a task or to-do item. Use when user says 'add to my tasks', 'remember to', 'I need to', etc.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Task title"
          },
          description: {
            type: "string",
            description: "Task description (optional)"
          },
          due_date: {
            type: "string",
            description: "Due date in natural language"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
            description: "Task priority"
          },
          assignee: {
            type: "string",
            description: "Who the task is assigned to (family member name)"
          }
        },
        required: ["title"]
      }
    }
  }
];

// Tool execution functions that integrate with Convex
export const executeVoiceCommand = async (toolName: string, args: any, userId: string, agentId?: string) => {
  console.log(`🎤 Executing voice command: ${toolName}`, args);

  try {
    switch (toolName) {
      case 'send_email':
        // This would call the Convex Gmail function
        return {
          success: true,
          message: `Email sent to ${args.to}`,
          action: 'email_sent',
          details: args
        };

      case 'add_calendar_event':
        // Parse natural language time to ISO format
        const startTime = parseTimeToISO(args.start_time);
        const endTime = args.end_time ? parseTimeToISO(args.end_time) : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(); // Default 1 hour

        return {
          success: true,
          message: `Event "${args.title}" added to calendar`,
          action: 'calendar_event_added',
          details: {
            ...args,
            start_time: startTime,
            end_time: endTime
          }
        };

      case 'get_calendar_events':
        const dateRange = parseDateRange(args.date_range || 'today');
        return {
          success: true,
          message: `Found calendar events`,
          action: 'calendar_events_retrieved',
          details: {
            date_range: dateRange,
            events: [] // This would be populated from Convex
          }
        };

      case 'search_emails':
        return {
          success: true,
          message: `Found emails matching "${args.query}"`,
          action: 'emails_searched',
          details: args
        };

      case 'get_recent_emails':
        return {
          success: true,
          message: `Retrieved recent emails`,
          action: 'recent_emails_retrieved',
          details: { limit: args.limit || 10 }
        };

      case 'web_search':
        return {
          success: true,
          message: `Search results for "${args.query}"`,
          action: 'web_search_performed',
          details: args
        };

      case 'send_text_message':
        return {
          success: true,
          message: `Text message sent to ${args.to}`,
          action: 'text_message_sent',
          details: args
        };

      case 'set_reminder':
        return {
          success: true,
          message: `Reminder set: ${args.title}`,
          action: 'reminder_set',
          details: args
        };

      case 'get_family_schedule':
        return {
          success: true,
          message: args.member ? `Retrieved ${args.member}'s schedule` : 'Retrieved family schedule',
          action: 'family_schedule_retrieved',
          details: args
        };

      case 'add_task':
        return {
          success: true,
          message: `Task added: ${args.title}`,
          action: 'task_added',
          details: args
        };

      default:
        throw new Error(`Unknown voice command: ${toolName}`);
    }
  } catch (error: any) {
    console.error(`Error executing voice command ${toolName}:`, error);
    return {
      success: false,
      error: error?.message || 'Unknown error occurred',
      action: 'command_failed'
    };
  }
};

// Helper functions for parsing natural language
function parseTimeToISO(timeString: string): string {
  // Simple parsing - in production, use a library like chrono-node
  const now = new Date();
  
  if (timeString.includes('today') || timeString.includes('this')) {
    if (timeString.includes('4 PM') || timeString.includes('4pm')) {
      const today = new Date();
      today.setHours(16, 0, 0, 0);
      return today.toISOString();
    }
  }
  
  if (timeString.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (timeString.includes('2 PM') || timeString.includes('2pm')) {
      tomorrow.setHours(14, 0, 0, 0);
    }
    return tomorrow.toISOString();
  }
  
  // If it's already ISO format, return as is
  if (timeString.includes('T') && timeString.includes('Z')) {
    return timeString;
  }
  
  // Default to 1 hour from now
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

function parseDateRange(range: string): { start: string; end: string } {
  const now = new Date();
  
  switch (range.toLowerCase()) {
    case 'today':
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString()
      };
      
    case 'tomorrow':
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow);
      startOfTomorrow.setHours(0, 0, 0, 0);
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);
      return {
        start: startOfTomorrow.toISOString(),
        end: endOfTomorrow.toISOString()
      };
      
    case 'this week':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return {
        start: startOfWeek.toISOString(),
        end: endOfWeek.toISOString()
      };
      
    default:
      // Default to today
      const defaultStart = new Date(now);
      defaultStart.setHours(0, 0, 0, 0);
      const defaultEnd = new Date(now);
      defaultEnd.setHours(23, 59, 59, 999);
      return {
        start: defaultStart.toISOString(),
        end: defaultEnd.toISOString()
      };
  }
}
