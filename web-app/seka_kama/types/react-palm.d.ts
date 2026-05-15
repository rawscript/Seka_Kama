declare module 'react-palm/tasks' {
  export const taskMiddleware: any;
  export function handleTasks(option?: any): any;
}

declare module 'react-palm' {
  export function withTask(reducer: any, task: any): any;
}
