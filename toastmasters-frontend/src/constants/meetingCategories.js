// Meeting and Role Categories Constants
export const MEETING_CATEGORIES = {
  REGULAR: 'REGULAR_MEETING',
  CONTEST: 'CONTEST_MEETING', 
  SPECIAL: 'SPECIAL_MILESTONE_MEETING'
};

export const MEETING_CATEGORY_LABELS = {
  [MEETING_CATEGORIES.REGULAR]: 'Regular Meeting',
  [MEETING_CATEGORIES.CONTEST]: 'Contest Meeting',
  [MEETING_CATEGORIES.SPECIAL]: 'Special/Milestone Meeting'
};

export const ROLE_CATEGORIES = {
  SHARED_ALL_MEETINGS: 'SHARED_ALL_MEETINGS',
  REGULAR_ONLY: 'REGULAR_MEETING_ONLY',
  CONTEST_ONLY: 'CONTEST_MEETING_ONLY',
  SPECIAL_ONLY: 'SPECIAL_MILESTONE_ONLY',
  REGULAR_AND_SPECIAL: 'REGULAR_AND_SPECIAL_MEETINGS'
};

export const ROLE_CATEGORY_LABELS = {
  [ROLE_CATEGORIES.SHARED_ALL_MEETINGS]: 'All Meeting Types (Shared)',
  [ROLE_CATEGORIES.REGULAR_ONLY]: 'Regular Meeting Only',
  [ROLE_CATEGORIES.CONTEST_ONLY]: 'Contest Meeting Only',
  [ROLE_CATEGORIES.SPECIAL_ONLY]: 'Special/Milestone Only',
  [ROLE_CATEGORIES.REGULAR_AND_SPECIAL]: 'Regular & Special Meetings'
};

// Role duplication rules by meeting type
export const ROLE_DUPLICATION_RULES = {
  [MEETING_CATEGORIES.CONTEST]: {
    // Contest meeting - contestants are multiple, max 2 timers, multiple evaluators, other roles unique
    duplicatable: ['Timer', 'Contestant', 'Evaluator', 'Speech Evaluator'],
    maxCount: {
      'Timer': 2, // Fixed 2 timers maximum
      'Contestant': 10, // Multiple contestants allowed
      'Evaluator': 10, // Multiple evaluators allowed
      'Speech Evaluator': 10 // Multiple speech evaluators allowed
    }
  },
  [MEETING_CATEGORIES.REGULAR]: {
    // Regular meeting - only speaker and timer can duplicate, remaining roles unique
    duplicatable: ['Speaker', 'Timer'],
    maxCount: {
      'Speaker': 10, // Multiple speakers allowed
      'Timer': 10 // Multiple timers allowed
    }
  },
  [MEETING_CATEGORIES.SPECIAL]: {
    // Special meeting - only speaker and timer can duplicate, remaining roles unique
    duplicatable: ['Speaker', 'Timer'],
    maxCount: {
      'Speaker': 10, // Multiple speakers allowed
      'Timer': 10 // Multiple timers allowed
    }
  }
};

// Helper function to check if a role can be duplicated for a meeting type
export const canRoleBeDuplicated = (meetingCategory, roleName) => {
  const rules = ROLE_DUPLICATION_RULES[meetingCategory];
  if (!rules) return false;
  
  // Only check for exact match (case-insensitive)
  const lowerRoleName = roleName.toLowerCase();
  return rules.duplicatable.some(duplicatableRole => 
    lowerRoleName === duplicatableRole.toLowerCase()
  );
};

// Helper function to get max count for a role in a meeting type
export const getMaxRoleCount = (meetingCategory, roleName) => {
  const rules = ROLE_DUPLICATION_RULES[meetingCategory];
  if (!rules) return 1;
  
  // Check for exact match first
  if (rules.maxCount[roleName]) return rules.maxCount[roleName];
  
  // Check for exact matches only (case-insensitive)
  const lowerRoleName = roleName.toLowerCase();
  for (const [duplicatableRole, maxCount] of Object.entries(rules.maxCount)) {
    if (lowerRoleName === duplicatableRole.toLowerCase()) {
      return maxCount;
    }
  }
  
  return 1; // Default to 1 if not found in duplicatable roles
};

// Helper function to get applicable roles for a meeting category
export const getApplicableRoleCategories = (meetingCategory) => {
  switch (meetingCategory) {
    case MEETING_CATEGORIES.REGULAR:
      return [ROLE_CATEGORIES.SHARED_ALL_MEETINGS, ROLE_CATEGORIES.REGULAR_ONLY, ROLE_CATEGORIES.REGULAR_AND_SPECIAL];
    case MEETING_CATEGORIES.CONTEST:
      return [ROLE_CATEGORIES.SHARED_ALL_MEETINGS, ROLE_CATEGORIES.CONTEST_ONLY];
    case MEETING_CATEGORIES.SPECIAL:
      return [ROLE_CATEGORIES.SHARED_ALL_MEETINGS, ROLE_CATEGORIES.SPECIAL_ONLY, ROLE_CATEGORIES.REGULAR_AND_SPECIAL];
    default:
      return [ROLE_CATEGORIES.SHARED_ALL_MEETINGS, ROLE_CATEGORIES.REGULAR_ONLY, ROLE_CATEGORIES.CONTEST_ONLY, ROLE_CATEGORIES.SPECIAL_ONLY, ROLE_CATEGORIES.REGULAR_AND_SPECIAL];
  }
};
