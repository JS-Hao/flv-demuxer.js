import logger from '../utils/logger';
import { combineBits } from '../utils/bitCalc';
import { getUint8ArrayReader } from '../utils/readBuffer';
import mergeBuffer from '../utils/mergeBuffer';

import {
  TagHeader,
  VideoMetaData,
  AVCDecoderConfigurationRecord,
} from '../types';

export default class VideoTagParser {
  private nalStart = new Uint8Array([0x00, 0x00, 0x00, 0x01]);
  private AVCDecoderConfigurationRecord?: AVCDecoderConfigurationRecord;
  private handleNALUsParsed?: (data: ArrayBuffer[]) => void;
  private handleMetaDataParsed?: (data: VideoMetaData) => void;

  /**
   * parse the video tag
   * @param buffer the buffer of the tag body
   * @param tagHeader the header is parsed to specified format
   */
  parse(buffer: ArrayBuffer, tagHeader: TagHeader) {
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

    const remainData = buffer.slice(5);

    if (AVCPacketType === 0) {
      // parse the AVC sequence header
      const {
        AVCDecoderConfigurationRecord,
        NALUs: PartNALUs,
      } = this.parseAVCRecorderConfigurationRecord(remainData);

      this.AVCDecoderConfigurationRecord = AVCDecoderConfigurationRecord;

      this.handleMetaDataParsed &&
        this.handleMetaDataParsed({
          frameType,
          codecId,
          AVCPacketType,
          compositionTime,
          pts,
          AVCDecoderConfigurationRecord,
        });

      this.handleNALUsParsed && this.handleNALUsParsed(PartNALUs);
    } else if (AVCPacketType === 1) {
      // parse the AVC NALU
      const NALUs = this.parseNALUs(
        remainData,
        this.AVCDecoderConfigurationRecord?.lengthSizeMinusOne
      );

      this.handleNALUsParsed && this.handleNALUsParsed(NALUs);
    }
  }

  onMetaDataParsed(callback: (data: VideoMetaData) => void) {
    this.handleMetaDataParsed = callback;
  }

  onNALUsParsed(callback: (data: ArrayBuffer[]) => void) {
    this.handleNALUsParsed = callback;
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
      NALUs.push(mergeBuffer(this.nalStart, SPS));
    }

    const numOfPictureParameterSets = reader(1)[0];

    for (let index = 0; index < numOfPictureParameterSets; index++) {
      const PPSSize = this.readBufferSum(reader(2));
      const PPS = reader(PPSSize);
      NALUs.push(mergeBuffer(this.nalStart, PPS));
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
  ): ArrayBuffer[] {
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
      NALUs.push(mergeBuffer(this.nalStart, NALU));
    }

    return NALUs;
  }

  private readBufferSum(array: Uint8Array, uint = true) {
    return array.reduce(
      (totle, num, index) =>
        totle + (uint ? num : num - 128) * 256 ** (array.length - index - 1),
      0
    );
  }
}
