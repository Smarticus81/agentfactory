export function getAssistantName(userType: string, userName: string): string {
  const baseName = userName ? `${userName}'s` : 'Your';
  switch (userType) {
    case 'family': return `${baseName} Family Assistant`;
    case 'student': return `${baseName} Study Buddy`;
    case 'business': return `${baseName} Business Assistant`;
    default: return `${baseName} Personal Assistant`;
  }
}

export function getAssistantType(userType: string): string {
  switch (userType) {
    case 'family': return 'Family Assistant';
    case 'student': return 'Student Helper';
    case 'business': return 'Personal Admin';
    default: return 'Custom';
  }
}

export function getAssistantDescription(userType: string): string {
  switch (userType) {
    case 'family': return 'A helpful family assistant that manages schedules, coordinates activities, and keeps everyone organized.';
    case 'student': return 'An academic assistant that helps with study schedules, assignment tracking, and educational support.';
    case 'business': return 'A professional assistant that manages meetings, emails, and business tasks efficiently.';
    default: return 'A versatile personal assistant ready to help with various tasks and organization.';
  }
}

export function getDefaultInstructions(userType: string, useCases: string[], goals: string[]): string {
  const baseInstructions = `You are a helpful AI assistant specialized for ${userType} users.

Primary use cases you should focus on:
${useCases.map(uc => `- ${uc}`).join('\n')}

User goals you should help achieve:
${goals.map(g => `- ${g}`).join('\n')}

Always be friendly, proactive, and focus on helping the user achieve their stated goals.`;

  switch (userType) {
    case 'family':
      return baseInstructions + `\n\nAs a family assistant, prioritize coordination, safety, and helping all family members stay organized. Be especially helpful with scheduling conflicts and family communication.`;
    case 'student':
      return baseInstructions + `\n\nAs a student helper, focus on academic success, time management, and learning support. Help break down complex tasks and maintain study schedules.`;
    case 'business':
      return baseInstructions + `\n\nAs a business assistant, maintain professionalism, prioritize efficiency, and help with productivity. Focus on meeting preparation, follow-ups, and task management.`;
    default:
      return baseInstructions + `\n\nAdapt your communication style to the user's preferences and always strive to be helpful and accurate.`;
  }
}
