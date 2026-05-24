import { TaskStatus } from '@prisma/client';

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.pending]: [TaskStatus.running, TaskStatus.failed],
  [TaskStatus.running]: [TaskStatus.succeeded, TaskStatus.failed],
  [TaskStatus.succeeded]: [],
  [TaskStatus.failed]: [],
};

/** @author Cursor AI */
export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
