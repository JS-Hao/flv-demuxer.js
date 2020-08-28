import logger from '../utils/logger';
import { combineBits } from '../utils/bitCalc';
import { getUint8ArrayReader } from '../utils/readBuffer';

import {
  Noun,
  TagHeader,
  VideoTagInfo,
  AVCDecoderConfigurationRecord,
} from '../types';

export default class VideoTagParser {
  private nalStart = new Uint8Array([0x00, 0x00, 0x00, 0x01]);
  private AVCDecoderConfigurationRecord?: AVCDecoderConfigurationRecord;

  /**
   * parse the video tag
   * @param buffer the buffer of the tag body
   * @param tagHeader the header is parsed to specified format
   */
  parse(
    buffer: ArrayBuffer,
    tagHeader: TagHeader
  ): { videoTagInfo: VideoTagInfo; NALUs: ArrayBuffer[] } {
    // parse tag data infomatioin
    const tagBody = new Uint8Array(buffer);
    const frameType = (tagBody[0] & 0b11110000) >> 4;
    const codecId = tagBody[0] & 0b00001111;

    logger.errorCdt(codecId === 7, `Unsupported codec: ${codecId}`);

    // parse AVC video packet
    const AVCPacketType = tagBody[1];
    const compositionTime = combineBits([tagBody[2], tagBody[3], tagBody[4]]);
    const pts = compositionTime + tagHeader.timestamp;

    logger.errorCdt(
      AVCPacketType === 0 || AVCPacketType === 1 || AVCPacketType === 2,
      `Unknown AVCPacketType: ${AVCPacketType}`
    );

    const videoTagInfo: VideoTagInfo = {
      type: Noun.VideoTagInfo,
      data: {
        frameType,
        codecId,
        AVCPacketType,
        compositionTime,
        pts,
      },
    };

    let NALUs: ArrayBuffer[] = [];

    const remainData = buffer.slice(5);

    if (AVCPacketType === 0) {
      // parse the AVC sequence header
      const {
        AVCDecoderConfigurationRecord,
        NALUs: PartNALUs,
      } = this.parseAVCRecorderConfigurationRecord(remainData);

      this.AVCDecoderConfigurationRecord = AVCDecoderConfigurationRecord;
      videoTagInfo.data.AVCDecoderConfigurationRecord = AVCDecoderConfigurationRecord;
      NALUs = NALUs.concat(PartNALUs);
    } else if (AVCPacketType === 1) {
      // parse the AVC NALU
      NALUs = NALUs.concat(
        this.parseNALUs(
          remainData,
          this.AVCDecoderConfigurationRecord?.lengthSizeMinusOne
        ).NALUs
      );
    }

    return {
      videoTagInfo,
      NALUs,
    };
  }

  private parseAVCRecorderConfigurationRecord(
    buffer: ArrayBuffer
  ): {
    AVCDecoderConfigurationRecord: AVCDecoderConfigurationRecord;
    NALUs: ArrayBuffer[];
  } {
    const NALUs = [];
    const { reader, isEnd } = getUint8ArrayReader(buffer);
    const configurationVersion = reader(1)[0];
    const AVCProfileIndication = reader(1)[0];
    const profile_compatibility = reader(1)[0];
    const AVCLevelIndication = reader(1)[0];
    const lengthSizeMinusOne = (reader(1)[0] & 0b00000011) + 1;
    const numOfSequenceParameterSets = reader(1)[0] & 0b00011111;

    for (let index = 0; index < numOfSequenceParameterSets; index++) {
      const SPSSize = this.readBufferSum(reader(2));
      const SPS = reader(SPSSize);
      NALUs.push(this.mergeBuffer(this.nalStart, SPS));
    }

    const numOfPictureParameterSets = reader(1)[0];

    for (let index = 0; index < numOfPictureParameterSets; index++) {
      const PPSSize = this.readBufferSum(reader(2));
      const PPS = reader(PPSSize);
      NALUs.push(this.mergeBuffer(this.nalStart, PPS));
    }

    logger.errorCdt(
      isEnd(),
      'some thing error in parseAVCRecorderConfigurationRecord'
    );

    const AVCDecoderConfigurationRecord = {
      configurationVersion,
      AVCProfileIndication,
      profile_compatibility,
      AVCLevelIndication,
      lengthSizeMinusOne,
      numOfSequenceParameterSets,
      numOfPictureParameterSets,
    };

    return {
      AVCDecoderConfigurationRecord,
      NALUs,
    };
  }

  private parseNALUs(
    buffer: ArrayBuffer,
    lengthSizeMinusOne?: number
  ): { NALUs: ArrayBuffer[] } {
    logger.errorCdt(
      lengthSizeMinusOne === 1 ||
        lengthSizeMinusOne === 3 ||
        lengthSizeMinusOne === 4,
      'no lengthSizeMinusOne before parsing the AVC NALU'
    );

    const { reader, isEnd } = getUint8ArrayReader(buffer);
    let NALUs: ArrayBuffer[] = [];

    while (!isEnd()) {
      const NALUSize = this.readBufferSum(reader(lengthSizeMinusOne as number));
      const NALU = reader(NALUSize);
      NALUs.push(this.mergeBuffer(this.nalStart, NALU));
    }

    return { NALUs };
  }

  private readBufferSum(array: Uint8Array, uint = true) {
    return array.reduce(
      (totle, num, index) =>
        totle + (uint ? num : num - 128) * 256 ** (array.length - index - 1),
      0
    );
  }

  private mergeBuffer(...buffers: Array<Uint8Array>) {
    const length = buffers.map(v => v.byteLength).reduce((v1, v2) => v1 + v2);
    const mergedBuffer = new ArrayBuffer(length);
    const mergedUi8a = new Uint8Array(mergedBuffer);

    let offset = 0;

    buffers.forEach(buffer => {
      mergedUi8a.set(buffer, offset);
      offset += buffer.byteLength;
    });

    return mergedBuffer;
  }
}
