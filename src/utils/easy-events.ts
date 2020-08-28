export default class EasyEvent {
  private map: {
    [name: string]: Array<Function>;
  } = {};

  on(name: string, callback: Function) {
    if (this.map[name]) {
      this.map[name].push(callback);
    } else {
      this.map[name] = [callback];
    }
  }

  emit(name: string, ...args: any) {
    if (this.map[name]) {
      this.map[name].forEach(f => f(...args));
    }
  }

  off(name: string, callback?: Function) {
    if (!this.map[name]) return;

    if (callback) {
      this.map[name] = this.map[name].filter(f => f !== callback);
    } else {
      delete this.map[name];
    }
  }

  offAll() {
    this.map = {};
  }
}
