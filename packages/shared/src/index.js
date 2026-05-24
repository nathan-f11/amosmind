"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_STATUS_TRANSITIONS = exports.TaskType = exports.TaskStatus = void 0;
exports.canTransition = canTransition;
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["RUNNING"] = "running";
    TaskStatus["SUCCEEDED"] = "succeeded";
    TaskStatus["FAILED"] = "failed";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskType;
(function (TaskType) {
    TaskType["TEXT2IMG"] = "text2img";
    TaskType["IMG2PROMPT"] = "img2prompt";
    TaskType["RESIZE"] = "resize";
})(TaskType || (exports.TaskType = TaskType = {}));
exports.TASK_STATUS_TRANSITIONS = {
    [TaskStatus.PENDING]: [TaskStatus.RUNNING, TaskStatus.FAILED],
    [TaskStatus.RUNNING]: [TaskStatus.SUCCEEDED, TaskStatus.FAILED],
    [TaskStatus.SUCCEEDED]: [],
    [TaskStatus.FAILED]: [],
};
function canTransition(from, to) {
    return exports.TASK_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
//# sourceMappingURL=index.js.map