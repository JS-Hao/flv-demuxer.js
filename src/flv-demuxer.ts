import FlvDemuxerCore from './flv-demuxer-core';
import { DemuxerEvent } from './types';
import { EventEmitter } from 'events';

export default class FlvDemuxer {
  private core: FlvDemuxerCore;
  private event: EventEmitter;

  constructor() {
    this.core = new FlvDemuxerCore();
    this.event = new EventEmitter();

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
        } else if (value && value.buffer) {
          this.core.parse(value.buffer);
          this.read(reader);
        } else {
          this.event.emit(
            DemuxerEvent.Error,
            new Error('no available data in reader!')
          );
        }
      })
      .catch(err => {
        this.event.emit(DemuxerEvent.Error, err);
      });
  }

  on(name: DemuxerEvent, callback: (...args: any[]) => void) {
    this.event.on(name, callback);
  }
}
