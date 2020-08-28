import Event from './easy-events';

export default new (class Logger {
  private event: Event = new Event();

  info(...args: any[]) {
    console.log('[info]', ...args);
    this.event.emit('info', ...args);
  }

  warn(...args: any[]) {
    console.warn('[warn]', ...args);
    this.event.emit('warn', ...args);
  }

  error(...args: any[]) {
    const error = this.combineError(...args);
    console.error('[error]', error);
    this.event.emit('error', error);
  }

  infoCdt(condition: boolean, ...args: any[]) {
    !condition && this.info(...args);
  }

  errorCdt(condition: boolean, ...args: any[]) {
    !condition && this.error(...args);
  }

  warnCdt(condition: boolean, ...args: any[]) {
    !condition && this.warn(...args);
  }

  onOutError(callback: Function) {
    this.event.on('error', callback);
  }

  onOutInfo(callback: Function) {
    this.event.on('info', callback);
  }

  onOutWarn(callback: Function) {
    this.event.on('warn', callback);
  }

  private combineError(...args: any[]) {
    const errMsg = args
      .map(arg => {
        if (arg instanceof Error) {
          return arg.message;
        } else {
          return arg.toString();
        }
      })
      .join(' ');

    return new Error(errMsg);
  }
})();
