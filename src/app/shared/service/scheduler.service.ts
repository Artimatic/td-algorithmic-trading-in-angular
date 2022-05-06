import { Injectable } from '@angular/core';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {
  scheduledTasks: { taskCb: () => {}; timeout: number; executionTime: number }[] = [];
  delay = 45000;

  constructor() { }

  schedule(taskCb) {
    if (this.scheduledTasks.length > 0) {
      const task = this.scheduledTasks[this.scheduledTasks.length - 1];

      let nextExecutionTime;
      let nextTimeout;

      if (task.executionTime > moment().valueOf()) {
        nextExecutionTime = task.executionTime + this.delay;
        nextTimeout = nextExecutionTime - moment().valueOf();
        this.scheduledTasks.push({ taskCb, timeout: nextTimeout, executionTime: nextExecutionTime });

        setTimeout(() => {
          taskCb();
        }, nextTimeout);
        return;
      } else {
        this.scheduledTasks = [];
      }
    }
    this.scheduledTasks.push({ taskCb, timeout: this.delay, executionTime: moment().valueOf() });
    setTimeout(() => {
      taskCb();
    }, this.delay);
    return;
  }
}
