export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  page?: string;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
}

export interface TourDefinition {
  id: string;
  steps: TourStep[];
}

export const WELCOME_TOUR: TourDefinition = {
  id: "welcome-tour",
  steps: [
    {
      id: "welcome-team-switcher",
      targetSelector: '[data-tour="team-switcher"]',
      title: "Your Team",
      description: "Switch between teams or create new ones from here.",
      placement: "right",
    },
    {
      id: "welcome-nav-company",
      targetSelector: '[data-tour="nav-company"]',
      title: "Company Overview",
      description: "See your company dashboard with financials, team metrics, and A&R pipeline at a glance.",
      placement: "right",
    },
    {
      id: "welcome-nav-artists",
      targetSelector: '[data-tour="nav-artists"]',
      title: "Artist Roster",
      description: "Manage your roster—add artists, organize into folders, and track everything in one place.",
      placement: "right",
    },
    {
      id: "welcome-nav-mywork",
      targetSelector: '[data-tour="nav-mywork"]',
      title: "My Work",
      description: "Your personal task list and notes. Track expenses and revenue directly from tasks.",
      placement: "right",
    },
    {
      id: "welcome-roster-tabs",
      targetSelector: '[data-tour="roster-tabs"]',
      title: "Roster & A&R",
      description: "Toggle between your current roster and A&R prospect pipeline.",
      page: "/roster",
      placement: "bottom",
    },
    {
      id: "welcome-add-artist",
      targetSelector: '[data-tour="add-artist-btn"]',
      title: "Add Artists",
      description: "Search Spotify to add artists or create them manually.",
      page: "/roster",
      placement: "bottom",
    },
    {
      id: "welcome-overview-tabs",
      targetSelector: '[data-tour="overview-tabs"]',
      title: "Company Tabs",
      description: "Navigate between Dashboard, Agenda, Staff, and Finance views.",
      page: "/overview",
      placement: "bottom",
    },
    {
      id: "welcome-mywork-creator",
      targetSelector: '[data-tour="mywork-creator"]',
      title: "Quick Add",
      description: "Type to create work items. Use @ to link artists and $ for expenses. You're all set!",
      page: "/my-work",
      placement: "bottom",
    },
  ],
};

export const ROSTER_TOUR: TourDefinition = {
  id: "roster-tour",
  steps: [
    {
      id: "roster-tabs",
      targetSelector: '[data-tour="roster-tabs"]',
      title: "Current Roster & A&R",
      description: "Switch between your signed artists and your A&R prospect pipeline.",
      placement: "bottom",
    },
    {
      id: "roster-sort",
      targetSelector: '[data-tour="roster-sort"]',
      title: "Sort Artists",
      description: "Sort your roster by name, listeners, or spending.",
      placement: "bottom",
    },
    {
      id: "roster-add-category",
      targetSelector: '[data-tour="add-category-btn"]',
      title: "Categories",
      description: "Organize artists into folders by genre, priority, or any grouping you want.",
      placement: "bottom",
    },
    {
      id: "roster-add-artist",
      targetSelector: '[data-tour="add-artist-btn"]',
      title: "Add Artist",
      description: "Add artists from Spotify or create them manually.",
      placement: "bottom",
    },
  ],
};

export const ARTIST_DETAIL_TOUR: TourDefinition = {
  id: "artist-detail-tour",
  steps: [
    {
      id: "artist-action-buttons",
      targetSelector: '[data-tour="artist-actions"]',
      title: "Quick Actions",
      description: "Toggle Finance, Budgets, Objectives, and Info panels for this artist.",
      placement: "bottom",
    },
    {
      id: "artist-tabs",
      targetSelector: '[data-tour="artist-tabs"]',
      title: "Artist Tabs",
      description: "Switch between Work, Links, Release Plans, and Splits.",
      placement: "bottom",
    },
    {
      id: "artist-banner",
      targetSelector: '[data-tour="artist-banner"]',
      title: "Artist Banner",
      description: "Hover to upload a custom banner or sync from Spotify.",
      placement: "bottom",
    },
  ],
};

export const OVERVIEW_TOUR: TourDefinition = {
  id: "overview-tour",
  steps: [
    {
      id: "overview-tabs",
      targetSelector: '[data-tour="overview-tabs"]',
      title: "Company Views",
      description: "Switch between Dashboard, Agenda, Staff, and Finance views for your company.",
      placement: "bottom",
    },
    {
      id: "overview-sections",
      targetSelector: '[data-tour="overview-sections"]',
      title: "Dashboard Widgets",
      description: "Drag to reorder, collapse, or hide sections. Customize your dashboard layout.",
      placement: "top",
    },
  ],
};

export const MYWORK_TOUR: TourDefinition = {
  id: "mywork-tour",
  steps: [
    {
      id: "mywork-tabs",
      targetSelector: '[data-tour="mywork-tabs"]',
      title: "Work & Notes",
      description: "Toggle between your task list and personal notes.",
      placement: "bottom",
    },
    {
      id: "mywork-creator",
      targetSelector: '[data-tour="mywork-creator"]',
      title: "Quick Add Tasks",
      description: "Type to create work items. Use @ to link an artist, $ for expense tracking, and dates are auto-detected.",
      placement: "bottom",
    },
    {
      id: "mywork-filter",
      targetSelector: '[data-tour="mywork-filter"]',
      title: "Filter by Artist",
      description: "Filter your tasks by artist to focus on specific projects.",
      placement: "bottom",
    },
  ],
};

export const SETTINGS_TOUR: TourDefinition = {
  id: "settings-tour",
  steps: [
    {
      id: "settings-tabs",
      targetSelector: '[data-tour="settings-tabs"]',
      title: "Settings Sections",
      description: "Manage your profile, notifications, team, plan, and billing from here.",
      placement: "bottom",
    },
  ],
};

export const ALL_TOURS: TourDefinition[] = [
  WELCOME_TOUR,
  ROSTER_TOUR,
  ARTIST_DETAIL_TOUR,
  OVERVIEW_TOUR,
  MYWORK_TOUR,
  SETTINGS_TOUR,
];

export function getTourById(tourId: string): TourDefinition | undefined {
  return ALL_TOURS.find((t) => t.id === tourId);
}
