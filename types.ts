export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type Task = {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  sortOrder: number;
  categoryId?: string;
  source?: string;
  sourceTag?: string;
  sourceFile?: string;
  sourceLine?: number;
  groupTag?: string;
  subTag?: string;
};

export type Category = {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  sortOrder: number;
  groupId?: string;
  sourceGroupKey?: string;
  sourceCategoryKey?: string;
};

export type CategoryGroup = {
  id: string;
  name: string;
  sortOrder: number;
  collapsed?: boolean;
  archived?: boolean;
  sourceGroupKey?: string;
};

export type ScanResult = {
  tasks: Task[];
  categories: Category[];
  categoryGroups: CategoryGroup[];
};
