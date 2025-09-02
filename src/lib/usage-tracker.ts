// Usage tracking utilities for recording assistant interactions

export interface UsageEvent {
  userId: string;
  category: 'voice_minutes' | 'email_sends' | 'rag_queries' | 'web_searches' | 'calendar_events';
  amount: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class UsageTracker {
  private static instance: UsageTracker;
  private events: UsageEvent[] = [];

  static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  // Record a usage event
  async recordUsage(event: UsageEvent): Promise<boolean> {
    try {
      // Store in memory for now (in real app, this would go to Convex)
      this.events.push({
        ...event,
        sessionId: event.sessionId || `session_${Date.now()}`,
        metadata: {
          ...event.metadata,
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'
        }
      });

      // Also store in localStorage for persistence
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('usage_events') || '[]';
        const existingEvents = JSON.parse(stored);
        existingEvents.push(event);
        
        // Keep only last 100 events to prevent storage issues
        const recentEvents = existingEvents.slice(-100);
        localStorage.setItem('usage_events', JSON.stringify(recentEvents));
      }

      console.log('Usage recorded:', event);
      return true;
    } catch (error) {
      console.error('Failed to record usage:', error);
      return false;
    }
  }

  // Get usage summary for a user
  getUserUsage(userId: string, days: number = 30): Record<string, number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get from memory
    const recentEvents = this.events.filter(event => 
      event.userId === userId && 
      event.metadata?.timestamp && 
      new Date(event.metadata.timestamp) >= cutoffDate
    );

    // Also get from localStorage if available
    let storedEvents: UsageEvent[] = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('usage_events') || '[]';
        storedEvents = JSON.parse(stored).filter((event: UsageEvent) => 
          event.userId === userId
        );
      } catch (error) {
        console.error('Failed to load stored events:', error);
      }
    }

    // Combine and deduplicate events
    const allEvents = [...recentEvents, ...storedEvents];
    
    // Aggregate by category
    const summary = allEvents.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + event.amount;
      return acc;
    }, {} as Record<string, number>);

    return summary;
  }

  // Get recent activity for a user
  getRecentActivity(userId: string, limit: number = 10): UsageEvent[] {
    const userEvents = this.events.filter(event => event.userId === userId);
    
    // Also get from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('usage_events') || '[]';
        const storedEvents = JSON.parse(stored).filter((event: UsageEvent) => 
          event.userId === userId
        );
        userEvents.push(...storedEvents);
      } catch (error) {
        console.error('Failed to load stored events:', error);
      }
    }

    // Sort by timestamp and return most recent
    return userEvents
      .sort((a, b) => {
        const timeA = a.metadata?.timestamp || '0';
        const timeB = b.metadata?.timestamp || '0';
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      })
      .slice(0, limit);
  }

  // Helper methods for common actions
  async recordVoiceInteraction(userId: string, durationMinutes: number, agentName?: string): Promise<boolean> {
    return this.recordUsage({
      userId,
      category: 'voice_minutes',
      amount: durationMinutes,
      metadata: {
        agentName,
        type: 'voice_interaction'
      }
    });
  }

  async recordEmailSent(userId: string, recipientCount: number = 1, agentName?: string): Promise<boolean> {
    return this.recordUsage({
      userId,
      category: 'email_sends',
      amount: recipientCount,
      metadata: {
        agentName,
        type: 'email_send'
      }
    });
  }

  async recordRagQuery(userId: string, queryCount: number = 1, agentName?: string): Promise<boolean> {
    return this.recordUsage({
      userId,
      category: 'rag_queries',
      amount: queryCount,
      metadata: {
        agentName,
        type: 'rag_query'
      }
    });
  }

  async recordWebSearch(userId: string, searchCount: number = 1, agentName?: string): Promise<boolean> {
    return this.recordUsage({
      userId,
      category: 'web_searches',
      amount: searchCount,
      metadata: {
        agentName,
        type: 'web_search'
      }
    });
  }

  async recordCalendarEvent(userId: string, eventCount: number = 1, agentName?: string): Promise<boolean> {
    return this.recordUsage({
      userId,
      category: 'calendar_events',
      amount: eventCount,
      metadata: {
        agentName,
        type: 'calendar_event'
      }
    });
  }

  // Get interaction count for an agent
  getAgentInteractions(userId: string, agentName: string): number {
    const agentEvents = this.events.filter(event => 
      event.userId === userId && 
      event.metadata?.agentName === agentName
    );

    // Also check localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('usage_events') || '[]';
        const storedEvents = JSON.parse(stored).filter((event: UsageEvent) => 
          event.userId === userId && 
          event.metadata?.agentName === agentName
        );
        agentEvents.push(...storedEvents);
      } catch (error) {
        console.error('Failed to load stored events:', error);
      }
    }

    return agentEvents.length;
  }

  // Generate mock interactions for demo purposes
  generateMockInteractions(userId: string): void {
    const agents = ['Family Assistant', 'Personal Admin', 'Study Buddy'];
    const categories: UsageEvent['category'][] = ['voice_minutes', 'email_sends', 'rag_queries', 'web_searches', 'calendar_events'];
    
    // Generate some random usage data for the last 7 days
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(timestamp.getHours() - hoursAgo);

      const event: UsageEvent = {
        userId,
        category: categories[Math.floor(Math.random() * categories.length)],
        amount: Math.floor(Math.random() * 5) + 1,
        metadata: {
          agentName: agents[Math.floor(Math.random() * agents.length)],
          timestamp: timestamp.toISOString(),
          type: 'mock_interaction'
        }
      };

      this.events.push(event);
    }
  }
}

// Singleton instance
export const usageTracker = UsageTracker.getInstance();

// Helper function to initialize with mock data
export const initializeMockUsage = (userId: string) => {
  const tracker = UsageTracker.getInstance();
  
  // Only generate mock data if we don't have any existing data
  const existingData = tracker.getUserUsage(userId);
  const hasData = Object.values(existingData).some(value => value > 0);
  
  if (!hasData) {
    tracker.generateMockInteractions(userId);
  }
};
