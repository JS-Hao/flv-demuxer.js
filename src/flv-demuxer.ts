import FlvDemuxerCore from './flv-demuxer-core';
import { DemuxerEvent } from './types';
import { EventEmitter } from 'events';
import logger from './utils/logger';

export default class FlvDemuxer {
  private core: FlvDemuxerCore;
  private event: EventEmitter;
  private manualStop: boolean;

  constructor() {
    this.core = new FlvDemuxerCore();
    this.event = new EventEmitter();
    this.manualStop = false;

    this.core.on(DemuxerEvent.Data, (...args: any[]) =>
      this.event.emit(DemuxerEvent.Data, ...args)
    );
  }

  read(reader: ReadableStreamReader) {
    reader
      .read()
      .then(chunk => {
        const { done, value } = chunk;

        if (done) {
          this.event.emit(DemuxerEvent.Done);
        } else if (this.manualStop) {
          this.manualStop = false;
        } else if (value && value.buffer) {
          this.core.parse(value.buffer);
          this.read(reader);
        } else {
          logger.error('no available data in reader!');
        }
      })
      .catch(err => {
        logger.error(err);
      });
  }

  stop() {
    this.manualStop = true;
  }

  on(name: DemuxerEvent, callback: (...args: any[]) => void) {
    switch (name) {
      case DemuxerEvent.Data:
      case DemuxerEvent.Done:
      case DemuxerEvent.Reconnect:
        // this.event.on(name, callback);
        break;

      case DemuxerEvent.Error:
        logger.onOutError(callback);
        break;

      default:
        break;
    }

    if (name === DemuxerEvent.Error) {
      logger.onOutError(callback);
    } else {
      this.event.on(name, callback);
    }
  }
}
