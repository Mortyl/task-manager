export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Board {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  owner: User;
  columns: Column[];
  members: BoardMember[];
  createdAt: Date;
}

export interface BoardMember {
  id: string;
  role: string;
  user: User;
  boardId: string;
}

export interface Column {
  id: string;
  title: string;
  order: number;
  boardId: string;
  cards: Card[];
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  order: number;
  dueDate?: Date;
  columnId: string;
  creator: User;
  assignee?: User;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

export type SocketEvent =
  | "card:created"
  | "card:updated"
  | "card:deleted"
  | "card:moved"
  | "column:created"
  | "column:updated"
  | "column:deleted"
  | "board:updated"
  | "member:joined";
