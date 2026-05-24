export declare enum TaskStatus {
    PENDING = "pending",
    RUNNING = "running",
    SUCCEEDED = "succeeded",
    FAILED = "failed"
}
export declare enum TaskType {
    TEXT2IMG = "text2img",
    IMG2PROMPT = "img2prompt",
    RESIZE = "resize"
}
export declare const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]>;
export declare function canTransition(from: TaskStatus, to: TaskStatus): boolean;
