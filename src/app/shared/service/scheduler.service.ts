import { Injectable } from '@angular/core';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {
  scheduledTasks: { taskName: string; taskCb: () => {}; timeout: number; executionTime: number }[] = [];
  delay = 45000;

  constructor() { }

  schedule(taskCb, taskName) {
    console.log('Scheduling: ', moment().format(), this.scheduledTasks);

    let scheduledTask;
    if (this.scheduledTasks.length > 0) {
      const task = this.scheduledTasks[this.scheduledTasks.length - 1];

      let nextExecutionTime;
      let nextTimeout;

      if (task.executionTime > moment().valueOf()) {
        nextExecutionTime = task.executionTime + this.delay;
        nextTimeout = nextExecutionTime - moment().valueOf() + this.delay;
        scheduledTask = { taskName, taskCb, timeout: nextTimeout, executionTime: nextExecutionTime };
        console.log('scheduled task: ', scheduledTask);

        this.scheduledTasks.push(scheduledTask);

        setTimeout(() => {
          console.log('Executing scheduled task: ', moment().format());
          taskCb();
        }, nextTimeout);
        return scheduledTask;
      }
    }
    this.scheduledTasks = [];
    console.log('no conflicting schedule: ', moment().format(), this.scheduledTasks);

    scheduledTask = { taskName, taskCb, timeout: this.delay, executionTime: moment().valueOf() + this.delay + 1000 };
    this.scheduledTasks.push(scheduledTask);
    setTimeout(() => {
      console.log('Executing scheduled task: ', moment().format(), scheduledTask);

      taskCb();
    }, scheduledTask.timeout);
    return scheduledTask;
  }
}
