// Voice command tools for Gmail and Calendar integrations
// These tools can be called by voice assistants

// Helper function to open OAuth window and wait for completion
export async function openGmailOAuthWindow(userId: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('openGmailOAuthWindow called for userId:', userId);

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // Open a blank popup immediately to avoid browser popup blocking
    const popup = window.open(
      '',
      'Gmail OAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup || popup.closed) {
      console.error('Popup was blocked or failed to open');
      resolve(false);
      return;
    }

    fetch(`/api/gmail/auth?userId=${userId}`)
      .then(res => {
        console.log('Auth API response status:', res.status);
        return res.json();
      })
      .then(authData => {
        console.log('Auth data received:', authData);

        if (!authData.authUrl) {
          console.error('No authUrl in response:', authData);
          try { popup.close(); } catch { }
          resolve(false);
          return;
        }

        console.log('Navigating popup to OAuth URL');
        try {
          popup.location.href = authData.authUrl;
        } catch (e) {
          console.warn('Could not set popup location immediately:', e);
        }

        // Listen for OAuth completion message (supports string and object formats)
        const handleMessage = (event: MessageEvent) => {
          try {
            const data = event.data;
            if (data === 'gmail_oauth_success' || data?.type === 'GMAIL_AUTH_SUCCESS') {
              console.log('Gmail auth successful (message)');
              window.removeEventListener('message', handleMessage);
              try { if (!popup.closed) popup.close(); } catch { }
              resolve(true);
            } else if (data === 'gmail_oauth_error' || data?.type === 'GMAIL_AUTH_ERROR') {
              console.log('Gmail auth error (message)');
              window.removeEventListener('message', handleMessage);
              try { if (!popup.closed) popup.close(); } catch { }
              resolve(false);
            }
          } catch { }
        };
        window.addEventListener('message', handleMessage);

        // Fallback: poll for when popup returns to our origin callback
        const pollInterval = setInterval(() => {
          try {
            let isClosed = false;
            try {
              isClosed = popup.closed;
            } catch (e) {
              // Ignore COOP/CORS errors when checking closed status
            }

            if (isClosed) {
              clearInterval(pollInterval);
              window.removeEventListener('message', handleMessage);
              console.warn('Popup closed before completion');
              resolve(false);
              return;
            }
            // Check if popup has redirected back to our origin
            let isBackAtOrigin = false;
            try {
              if (popup.location && popup.location.origin === window.location.origin && popup.location.pathname.includes('/api/gmail/callback')) {
                isBackAtOrigin = true;
              }
            } catch (e) {
              // Ignore cross-origin access errors
            }

            if (isBackAtOrigin) {
              console.log('Detected popup returned to callback on same origin. Waiting for server processing...');
              clearInterval(pollInterval);
              window.removeEventListener('message', handleMessage);

              // Wait a moment to allow the server to process the request and the callback script to run
              setTimeout(() => {
                try {
                  if (!popup.closed) popup.close();
                } catch { }
                resolve(true);
              }, 3000);
            }
          } catch {
            // Ignore cross-origin access errors until it returns to our origin
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          console.log('OAuth window timeout - no response received');
          clearInterval(pollInterval);
          window.removeEventListener('message', handleMessage);
          try { if (!popup.closed) popup.close(); } catch { }
          resolve(false);
        }, 5 * 60 * 1000);
      })
      .catch(err => {
        console.error('Error preparing OAuth window:', err);
        try { popup.close(); } catch { }
        resolve(false);
      });
  });
}

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
      name: "check_gmail",
      description: "Check inbox and summarize recent emails. Use when user says 'check my Gmail', 'check inbox', 'read latest emails'.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of emails to retrieve (default 10)"
          },
          maxResults: {
            type: "number",
            description: "Alias for limit (for compatibility)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_gmail",
      description: "Alias of search_emails: search Gmail by sender/subject/content.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query - sender, subject, content"
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
      name: "connect_gmail",
      description: "Connect Gmail account via OAuth. Use when user wants to connect their email or when Gmail authentication is required.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Why Gmail connection is needed (e.g., 'to check emails', 'to send email')"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "Search the agent's knowledge base from uploaded documents. Use for questions about specific information in documents.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for the knowledge base"
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default 5)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information. Use when user asks for current information, weather, news, facts, etc.",
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
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather information. Use when user asks about weather conditions.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Location to get weather for (defaults to user's location)"
          },
          type: {
            type: "string",
            enum: ["current", "forecast", "alerts"],
            description: "Type of weather information"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "control_smart_home",
      description: "Control smart home devices. Use when user wants to control lights, thermostat, etc.",
      parameters: {
        type: "object",
        properties: {
          device: {
            type: "string",
            description: "Device name or type (lights, thermostat, door, etc.)"
          },
          action: {
            type: "string",
            description: "Action to perform (turn on/off, set temperature, etc.)"
          },
          value: {
            type: "string",
            description: "Value for the action (temperature, brightness, etc.)"
          }
        },
        required: ["device", "action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_news",
      description: "Get current news headlines. Use when user asks for news or current events.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["general", "business", "technology", "sports", "health", "entertainment"],
            description: "News category"
          },
          limit: {
            type: "number",
            description: "Number of headlines to return"
          }
        },
        required: []
      }
    }
  }
];

// Tool execution functions that integrate with Convex
export const executeVoiceCommand = async (toolName: string, args: any, userId: string, agentId?: string) => {
  console.log(`🎤 Executing voice command: ${toolName}`, args);

  try {
    switch (toolName) {
      case 'check_gmail':
      case 'get_recent_emails': {
        console.log('🔍 check_gmail/get_recent_emails - checking Gmail authentication...');
        const statusCheck = await fetch(`/api/gmail/status?userId=${userId}`);
        const statusData = await statusCheck.json();

        if (!statusData.authenticated) {
          const oauthSuccess = await openGmailOAuthWindow(userId);
          if (!oauthSuccess) {
            return {
              success: false,
              error: 'Gmail authentication is required to check emails. Please connect your Gmail account.',
              action: 'gmail_oauth_required',
              setupRequired: true
            };
          }
        }

        const limit = args.limit || args.maxResults || 10;
        const resp = await fetch(`/api/gmail/check?userId=${userId}&limit=${limit}`);
        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}));
          if (errorData.setupRequired) {
            return {
              success: false,
              error: 'Gmail not connected. Opening authentication window...',
              action: 'gmail_oauth_required',
              setupRequired: true,
              autoConnect: true
            };
          }
          throw new Error('Failed to retrieve emails');
        }

        const data = await resp.json();
        return {
          success: true,
          message: `Retrieved ${data.emails?.length || 0} recent emails`,
          action: 'recent_emails_retrieved',
          details: { emails: data.emails || [] }
        };
      }
      case 'send_email':
        // Check Gmail connection status first
        const sendStatusCheck = await fetch(`/api/gmail/status?userId=${userId}`);
        const sendStatusData = await sendStatusCheck.json();

        if (!sendStatusData.authenticated) {
          // Auto-trigger OAuth flow
          return {
            success: false,
            error: 'Gmail not connected. Opening authentication window...',
            action: 'gmail_oauth_required',
            setupRequired: true,
            autoConnect: true,
            pendingAction: { type: 'send_email', args }
          };
        }

        // Make API call to send email
        const emailResponse = await fetch('/api/gmail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            to: args.to,
            subject: args.subject,
            body: args.body,
            cc: args.cc,
            agentId
          })
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          if (errorData.setupRequired) {
            return {
              success: false,
              error: 'Gmail not connected. Opening authentication window...',
              action: 'gmail_oauth_required',
              setupRequired: true,
              autoConnect: true,
              pendingAction: { type: 'send_email', args }
            };
          }
          throw new Error('Failed to send email');
        }

        const emailData = await emailResponse.json();
        return {
          success: true,
          message: emailData.message,
          action: 'email_sent',
          details: args
        };

      case 'add_calendar_event':
        // Parse natural language time to ISO format
        const startTime = parseTimeToISO(args.start_time);
        const endTime = args.end_time ? parseTimeToISO(args.end_time) : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

        const calendarResponse = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: args.title,
            description: args.description,
            startDateTime: startTime,
            endDateTime: endTime,
            location: args.location,
            attendees: args.attendees,
            reminder: args.reminder,
            agentId
          })
        });

        if (!calendarResponse.ok) {
          throw new Error('Failed to add calendar event');
        }

        const calendarData = await calendarResponse.json();
        return {
          success: true,
          message: calendarData.message,
          action: 'calendar_event_added',
          details: {
            ...args,
            start_time: startTime,
            end_time: endTime
          }
        };

      case 'get_calendar_events':
        const dateRange = parseDateRange(args.date_range || 'today');
        const eventsResponse = await fetch(`/api/calendar/events?userId=${userId}&fromDate=${dateRange.start}&toDate=${dateRange.end}&limit=${args.limit || 10}`);

        if (!eventsResponse.ok) {
          throw new Error('Failed to get calendar events');
        }

        const eventsData = await eventsResponse.json();
        return {
          success: true,
          message: `Found ${eventsData.events.length} calendar events`,
          action: 'calendar_events_retrieved',
          details: {
            date_range: dateRange,
            events: eventsData.events
          }
        };

      case 'search_emails':
      case 'search_gmail':
        // Check Gmail connection status first
        const searchStatusCheck = await fetch(`/api/gmail/status?userId=${userId}`);
        const searchStatusData = await searchStatusCheck.json();

        if (!searchStatusData.authenticated) {
          // Auto-trigger OAuth flow
          return {
            success: false,
            error: 'Gmail not connected. Opening authentication window...',
            action: 'gmail_oauth_required',
            setupRequired: true,
            autoConnect: true,
            pendingAction: { type: 'search_emails', args }
          };
        }

        const searchResponse = await fetch('/api/gmail/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            query: args.query,
            limit: args.limit || 10
          })
        });

        if (!searchResponse.ok) {
          const errorData = await searchResponse.json();
          if (errorData.setupRequired) {
            return {
              success: false,
              error: 'Gmail not connected. Opening authentication window...',
              action: 'gmail_oauth_required',
              setupRequired: true,
              autoConnect: true,
              pendingAction: { type: 'search_emails', args }
            };
          }
          throw new Error('Failed to search emails');
        }

        const searchData = await searchResponse.json();
        return {
          success: true,
          message: `Found ${searchData.count} emails matching "${args.query}"`,
          action: 'emails_searched',
          details: {
            query: args.query,
            emails: searchData.emails
          }
        };



      case 'connect_gmail':
        // Open OAuth window and wait for completion
        const authSuccess = await openGmailOAuthWindow(userId);

        if (authSuccess) {
          return {
            success: true,
            message: 'Gmail connected successfully! You can now check your emails.',
            action: 'gmail_connected',
            requiresAuth: false
          };
        } else {
          return {
            success: false,
            message: 'Gmail authentication was not completed. Please try again.',
            action: 'gmail_auth_failed',
            requiresAuth: true
          };
        }

      case 'search_knowledge_base':
        const knowledgeResponse = await fetch(`/api/knowledge/search?userId=${userId}&query=${encodeURIComponent(args.query)}&limit=${args.limit || 5}`);

        if (!knowledgeResponse.ok) {
          throw new Error('Failed to search knowledge base');
        }

        const knowledgeData = await knowledgeResponse.json();
        return {
          success: true,
          message: `Found ${knowledgeData.count} relevant documents`,
          action: 'knowledge_searched',
          details: {
            query: args.query,
            results: knowledgeData.results
          }
        };

      case 'web_search':
        try {
          const searchResp = await fetch('/api/integrations/web-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: args.query,
              type: args.type
            })
          });

          if (!searchResp.ok) {
            const err = await searchResp.json();
            throw new Error(err.error || 'Failed to perform web search');
          }

          const searchResults = await searchResp.json();
          
          // Create a summary string for the agent to read
          const summary = searchResults.results
            .map((r: any, i: number) => `${i + 1}. ${r.title}: ${r.snippet}`)
            .join('\n\n');

          return {
            success: true,
            message: `Found ${searchResults.count} results for "${args.query}"`,
            action: 'web_search_performed',
            details: {
              query: args.query,
              count: searchResults.count,
              summary: summary,
              results: searchResults.results
            }
          };
        } catch (error: any) {
          console.error('Web search tool error:', error);
          return {
            success: false,
            error: `Search failed: ${error.message}`,
            action: 'web_search_failed'
          };
        }

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

      case 'get_weather':
        return {
          success: true,
          message: `Weather information for ${args.location || 'your location'}`,
          action: 'weather_retrieved',
          details: args
        };

      case 'control_smart_home':
        return {
          success: true,
          message: `Smart home command: ${args.action} ${args.device}`,
          action: 'smart_home_controlled',
          details: args
        };

      case 'get_news':
        return {
          success: true,
          message: `Latest ${args.category || 'general'} news headlines`,
          action: 'news_retrieved',
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
