export enum DemuxerEvent {
  Data = 'data',
  Error = 'error',
  Done = 'done',
  Reconnect = 'reconnect',
}

export enum TagType {
  Audio = 'audio',
  Video = 'video',
  ScriptData = 'script data',
  Unknown = 'unknown',
}

export enum Noun {
  VideoTagInfo = 'video tag info',
  AVCSequenceHeader = 'AVC sequence header',
  NALUs = 'NALUs',
}

export interface TagHeader {
  tagType: TagType;
  tagDataSize: number;
  timestamp: number;
  streamId: number;
}

export interface VideoTagInfo {
  type: Noun.VideoTagInfo;
  data: {
    frameType: number;
    codecId: number;
    AVCPacketType: number;
    compositionTime: number;
    pts: number;
    // if AVCPacketType === 0 will appear the follow infomation
    AVCDecoderConfigurationRecord?: AVCDecoderConfigurationRecord;
  };
}

export interface AVCDecoderConfigurationRecord {
  configurationVersion: number;
  AVCProfileIndication: number;
  profile_compatibility: number;
  AVCLevelIndication: number;
  lengthSizeMinusOne: number;
  numOfSequenceParameterSets: number;
  numOfPictureParameterSets: number;
}

export interface NALUs {
  type: Noun.NALUs;
  data: ArrayBuffer;
}
