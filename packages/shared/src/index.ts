export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

export enum TaskType {
  TEXT2IMG = 'text2img',
  IMG2PROMPT = 'img2prompt',
  RESIZE = 'resize',
}

export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.RUNNING, TaskStatus.FAILED],
  [TaskStatus.RUNNING]: [TaskStatus.SUCCEEDED, TaskStatus.FAILED],
  [TaskStatus.SUCCEEDED]: [],
  [TaskStatus.FAILED]: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
