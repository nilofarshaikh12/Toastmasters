// Example roles to demonstrate the categorization system

export const EXAMPLE_ROLES = {
  // Shared roles (used in all meeting types)
  SHARED: [
    'Toastmaster',
    'Timer',
    'Ah-Counter', 
    'Grammarian',
    'General Evaluator',
    'Table Topics Master',
    'Sergeant at Arms'
  ],
  
  // Regular meeting specific roles
  REGULAR_ONLY: [
    'Prepared Speaker',
    'Speech Evaluator',
    'Backup Speaker'
  ],
  
  // Contest meeting specific roles  
  CONTEST_ONLY: [
    'Contest Chair',
    'Chief Judge',
    'Voting Judge',
    'Tally Counter',
    'Contest Timekeeper'
  ],
  
  // Special/Milestone meeting specific roles
  SPECIAL_ONLY: [
    'Event Coordinator',
    'Master of Ceremonies',
    'Awards Presenter',
    'Photography Coordinator',
    'Guest Relations'
  ]
};

export const ROLE_DESCRIPTIONS = {
  'Toastmaster': 'Leads the meeting and introduces speakers',
  'Timer': 'Times all speeches and meeting segments',
  'Contest Chair': 'Manages contest rules and procedures',
  'Event Coordinator': 'Organizes special event logistics'
};
