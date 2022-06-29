import { Injectable } from '@angular/core';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {
  scheduledTasks: { taskName: string; taskCb: () => {}; timeout: number; executionTime: number, timeoutId?: number }[] = [];
  delay = 45000;
  priorityEndtime;
  lastExecutionTime;
  priorityExecutionHoldTime;

  constructor() { }

  schedule(taskCb, taskName, stopTime = null, isPriority = false) {
    console.log('Scheduling: ', moment().format(), this.scheduledTasks.length, taskName);

    if (isPriority) {
      this.priorityExecutionHoldTime = moment().add({ milliseconds: this.delay + 300 });

      if (moment().isAfter(moment(this.lastExecutionTime).add({ milliseconds: this.delay }))) {
        taskCb();
        this.lastExecutionTime = moment().format();
      } else {
        setTimeout(() => {
          console.log('Executing priority task: ', moment().format(), taskName);
          taskCb();
          this.lastExecutionTime = moment().format();
        }, this.delay + 100);
      }
    }

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
          console.log('Too many tasks scheduled. Trying again later ', taskName);
          setTimeout(() => {
            this.schedule(taskCb, taskName, stopTime, isPriority);
          }, 900000);
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

        if (stopTime && moment(nextExecutionTime).isAfter(moment(stopTime))) {
          console.log('Scheduled event is after stop time.', taskName);
        } else {
          const id = this.createTimeout(taskCb, scheduledTask.name, nextTimeout);

          scheduledTask.timeoutId = id;
          this.scheduledTasks.push(scheduledTask);
        }

        return scheduledTask;
      }
    }
    this.scheduledTasks = [];

    scheduledTask = { taskName, taskCb, timeout: 1000, executionTime: moment().valueOf() + 1000 };

    const timeoutId = this.createTimeout(taskCb, scheduledTask.name, scheduledTask.timeout);

    scheduledTask.timeoutId = timeoutId;
    this.scheduledTasks.push(scheduledTask);

    return scheduledTask;
  }

  createTimeout(taskCb, name, timeout) {
    return setTimeout(() => {
      if (!this.priorityExecutionHoldTime || moment().isAfter(this.priorityExecutionHoldTime)) {
        console.log('Executing scheduled task: ', moment().format(), name);
        taskCb();
        this.lastExecutionTime = moment().format();
      } else {
        console.log('Dropping task for priority task', name, this.priorityExecutionHoldTime);
      }
    }, timeout);
  }
}
