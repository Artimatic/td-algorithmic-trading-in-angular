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
    console.log('Scheduling: ', moment().format(), this.scheduledTasks.length, taskName);

    if (this.scheduledTasks.length > 100) {
      if (moment(this.scheduledTasks[this.scheduledTasks.length - 1].executionTime).isBefore(moment())) {
        this.scheduledTasks = [];
      } else {
        const tasksCount = this.scheduledTasks.reduce((previousValue, currentValue) => {
          if (moment(currentValue.executionTime).isAfter(moment())) {
            if (previousValue[currentValue.taskName]) {
              previousValue[currentValue.taskName]++;
            } else {
              previousValue[currentValue.taskName] = 1;
            }
          }
          return previousValue;
        }, {});
        if (tasksCount[taskName] > 20) {
          console.log('Too many tasks scheduled. Dropping ', taskName);
        }
      }
    }

    let scheduledTask;
    if (this.scheduledTasks.length > 0) {
      const lastTask = this.scheduledTasks[this.scheduledTasks.length - 1];

      let nextExecutionTime;
      let nextTimeout;

      if (lastTask.executionTime > moment().valueOf()) {
        nextExecutionTime = lastTask.executionTime + this.delay;
        nextTimeout = nextExecutionTime - moment().valueOf() + this.delay;
        scheduledTask = { taskName, taskCb, timeout: nextTimeout, executionTime: nextExecutionTime };

        this.scheduledTasks.push(scheduledTask);

        setTimeout(() => {
          console.log('Executing scheduled task: ', moment().format(), scheduledTask.name);
          taskCb();
        }, nextTimeout);
        return scheduledTask;
      }
    }
    this.scheduledTasks = [];

    scheduledTask = { taskName, taskCb, timeout: 1000, executionTime: moment().valueOf() + 1000 };
    this.scheduledTasks.push(scheduledTask);
    setTimeout(() => {
      console.log('Executing scheduled task: ', moment().format(), scheduledTask);

      taskCb();
    }, scheduledTask.timeout);
    return scheduledTask;
  }
}
