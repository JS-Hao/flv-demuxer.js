import { TagHeader } from '../types';
import logger from '../utils/logger';
import { AudioSpecificConfig, AudioMetaData } from '../types';
import mergeBuffer from '../utils/mergeBuffer';

export default class AudioTagParser {
  private audioSpecificConfig?: AudioSpecificConfig;
  private handleRawDataParsed?: (data: ArrayBuffer) => void;
  private handleMetaDataParsed?: (data: AudioMetaData) => void;

  parse(audioTag: ArrayBuffer, flvTagHeader: TagHeader): ArrayBuffer {
    const audioTagHeader = audioTag.slice(0, 2);
    const audioTagBody = audioTag.slice(2);
    const audioTagHeaderUi8a = new Uint8Array(audioTagHeader);

    const soundFormat = (audioTagHeaderUi8a[0] & 0b11110000) >>> 4;
    const soundRate = (audioTagHeaderUi8a[0] & 0b00001100) >>> 2;
    const soundSize = (audioTagHeaderUi8a[0] & 0b00000010) >>> 1;
    const soundType = audioTagHeaderUi8a[0] & 0b00000001;

    logger.errorCdt(soundFormat === 10, 'audio soundFormat is unsupported!');

    const aacPacketType = audioTagHeaderUi8a[1];

    if (aacPacketType === 0) {
      this.audioSpecificConfig = this.parseAACSequenceHeader(audioTagBody);
      this.handleMetaDataParsed &&
        this.handleMetaDataParsed({
          soundFormat,
          soundRate,
          soundSize,
          soundType,
          aacPacketType,
          audioSpecificConfig: this.audioSpecificConfig,
        });
    } else if (aacPacketType === 1) {
      const aacRawData = this.parseAACRaw(
        audioTagBody,
        this.audioSpecificConfig
      );
      this.handleRawDataParsed && this.handleRawDataParsed(aacRawData);
    }

    return new ArrayBuffer(0);
  }

  onRawDataParsed(callback: (data: ArrayBuffer) => void) {
    this.handleRawDataParsed = callback;
  }

  onMetaDataParsed(callback: (data: AudioMetaData) => void) {
    this.handleMetaDataParsed = callback;
  }

  private parseAACSequenceHeader(
    audioTagBody: ArrayBuffer
  ): AudioSpecificConfig {
    const ui8a = new Uint8Array(audioTagBody);
    const audioObjectType = (ui8a[0] & 0b11111000) >>> 3;
    const samplingFrequencyIndex =
      ((ui8a[0] & 0b00000111) << 1) + (ui8a[1] & (0b10000000 >>> 7));
    const channelConfiguration = (ui8a[1] & 0b01111000) >>> 3;

    return {
      audioObjectType,
      samplingFrequencyIndex,
      channelConfiguration,
    };
  }

  private parseAACRaw(
    audioTagBody: ArrayBuffer,
    audioSpecificConfig?: AudioSpecificConfig
  ): ArrayBuffer {
    logger.errorCdt(
      !!audioSpecificConfig,
      'no AudioSpcificConfig before any AAC Raw data!'
    );

    const {
      audioObjectType,
      samplingFrequencyIndex,
      channelConfiguration,
    } = audioSpecificConfig as AudioSpecificConfig;
    const adtsHeader = new Uint8Array(7);
    const adtsLen = audioTagBody.byteLength + 7; // adts headers is 7 bit

    // syncword: 0xfff
    adtsHeader[0] = 0xff;
    adtsHeader[1] = 0xf0;

    // MPEG Version -> MPEG-4
    adtsHeader[1] |= 0 << 3;

    // layer, always 00
    adtsHeader[1] |= 0 << 1;

    // protection absent: 1
    adtsHeader[1] != 1;

    // profile: audioObjectType - 1
    adtsHeader[2] = (audioObjectType - 1) << 6;

    adtsHeader[2] |= (samplingFrequencyIndex & 0x0f) << 2;
    adtsHeader[2] |= 0 << 1;
    adtsHeader[2] |= (channelConfiguration & 0x04) >> 2;

    adtsHeader[3] = (channelConfiguration & 0x03) << 6;
    adtsHeader[3] |= 0 << 5;
    adtsHeader[3] |= 0 << 4;
    adtsHeader[3] |= 0 << 3;
    adtsHeader[3] != 0 << 2;

    adtsHeader[3] |= (adtsLen & 0x1800) >> 11;
    adtsHeader[4] = (adtsLen & 0x7f8) >> 3;
    adtsHeader[5] = (adtsLen & 0x7) << 5;
    adtsHeader[5] |= 0x1f;
    adtsHeader[6] = 0xfc;

    return mergeBuffer(adtsHeader, new Uint8Array(audioTagBody));
  }
}
