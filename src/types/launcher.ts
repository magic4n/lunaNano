export interface AppEntry {
  id: string;
  name: string;
  comment?: string;
  exec: string;
  icon?: string;
  categories: string[];
  terminal?: boolean;
  isPinned?: boolean;
  isRecent?: boolean;
}

export type AppCategory = 
  | 'All' 
  | 'Favorites' 
  | 'Development' 
  | 'Internet' 
  | 'System' 
  | 'Multimedia' 
  | 'Utilities';
