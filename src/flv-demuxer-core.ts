import { EventEmitter } from 'events';
import logger from './utils/logger';
import { combineBits } from './utils/bitCalc';
import { DemuxerEvent, TagType } from './types';

export default class FlvDemuxerCore {
  private event: EventEmitter;
  private consumedBytes: number;
  private remainBuffer: ArrayBuffer;
  private hasVideo: boolean;
  private hasAudio: boolean;

  constructor() {
    this.event = new EventEmitter();
    this.consumedBytes = 0;
    this.remainBuffer = new ArrayBuffer(0);
    this.hasAudio = false;
    this.hasVideo = false;
  }

  parse(chunk: ArrayBuffer) {
    // debugger;
    if (!this.consumedBytes) {
      const isMatch = this.isFlv(chunk);

      if (!isMatch) {
        this.throwError("the stream' format is not flv!");
      }
    }

    this.parseData(chunk);
  }

  on(name: DemuxerEvent, callback: (...args: any[]) => void) {
    this.event.on(name, callback);
  }

  private isFlv(chunk: ArrayBuffer) {
    const ui8a = new Uint8Array(chunk);
    const isF = ui8a[0] === 0x46;
    const isL = ui8a[1] === 0x4c;
    const isV = ui8a[2] === 0x56;

    return isF && isL && isV;
  }

  private parseData(chunk: ArrayBuffer) {
    const chunkUi8a = new Uint8Array(chunk);
    const remainUi8a = new Uint8Array(this.remainBuffer);
    const newArrayBuffer = new ArrayBuffer(
      chunk.byteLength + this.remainBuffer.byteLength
    );
    const newRemainUi8a = new Uint8Array(newArrayBuffer);

    newRemainUi8a.set(remainUi8a, 0);
    newRemainUi8a.set(chunkUi8a, this.remainBuffer.byteLength);

    if (this.consumedBytes < 9) {
      // must parse flv header first
      this.remainBuffer = this.parseFlvHeader(newArrayBuffer);
    } else {
      this.remainBuffer = this.parseFlvBody(newArrayBuffer);
    }
  }

  private parseFlvHeader(buffer: ArrayBuffer): ArrayBuffer {
    if (buffer.byteLength < 9) {
      // no enougth data to parse, return
      return buffer;
    } else {
      const ui8a = new Uint8Array(buffer, 0, 9);
      const flvVersion = ui8a[3];
      const hasAudio = (ui8a[4] & 0b00000100) >>> 2 === 1;
      const hasVideo = (ui8a[4] & 0b00000001) === 1;

      if (flvVersion !== 1) {
        this.throwError(`the flv version ${flvVersion} is not support!`);
      }

      this.hasAudio = hasAudio;
      this.hasVideo = hasVideo;

      this.consumedBytes += 9;
      return this.consumeBuffer(buffer, 9);
    }
  }

  private parsePrevTagSize(buffer: ArrayBuffer, offset: number): number {
    const ui8a = new Uint8Array(buffer, offset, 4);
    const prevTagSize = combineBits([ui8a[0], ui8a[1], ui8a[2], ui8a[3]]);

    return prevTagSize;
  }

  private parseTagHeader(
    buffer: ArrayBuffer,
    offset: number
  ): { tagType: string; tagDataSize: number; pts: number; streamId: number } {
    const ui8a = new Uint8Array(buffer, offset + 4, 11);
    const tagType = this.getTagType(ui8a[0]);
    const tagDataSize = combineBits([ui8a[1], ui8a[2], ui8a[3]]);
    const pts = combineBits([ui8a[7], ui8a[4], ui8a[5], ui8a[6]]);
    const streamId = combineBits([ui8a[8], ui8a[9], ui8a[10]]);
    return { tagType, tagDataSize, pts, streamId };
  }

  private parseFlvBody(buffer: ArrayBuffer): ArrayBuffer {
    let consumed = 0;

    while (buffer.byteLength - consumed >= 15) {
      const prevTagSize = this.parsePrevTagSize(buffer, consumed);
      const tagHeader = this.parseTagHeader(buffer, consumed);
      const { tagDataSize } = tagHeader;

      if (buffer.byteLength - consumed - 15 >= tagDataSize) {
        // parse tag body
        this.event.emit(DemuxerEvent.Data, { prevTagSize });
        this.event.emit(DemuxerEvent.Data, tagHeader);
        consumed += 15 + tagDataSize;
      } else {
        // wait for enougth data to parse
        break;
      }
    }

    this.consumedBytes += consumed;
    return this.consumeBuffer(buffer, consumed);
  }

  private throwError(msg: string) {
    const err = new Error(msg);
    this.event.emit(DemuxerEvent.Error, err);
    logger.error(err);
  }

  private consumeBuffer(buffer: ArrayBuffer, consumeSize: number): ArrayBuffer {
    if (buffer.byteLength < consumeSize) {
      this.throwError('the consumeSize is bigger than buffer!');
    }

    if (buffer.byteLength === consumeSize) {
      return new ArrayBuffer(0);
    }

    if (consumeSize === 0) {
      return buffer;
    }

    const newBuffer = new ArrayBuffer(buffer.byteLength - consumeSize);
    const remainUi8a = new Uint8Array(buffer, consumeSize);
    new Uint8Array(newBuffer).set(remainUi8a);

    return newBuffer;
  }

  private getTagType(ui8: number): TagType {
    switch (ui8) {
      case 8:
        return TagType.Audio;

      case 9:
        return TagType.Video;

      case 18:
        return TagType.ScriptData;

      default:
        this.throwError(`invalid tag type: ${ui8}`);
        return TagType.Unknown;
    }
  }
}
