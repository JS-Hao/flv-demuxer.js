export enum DemuxerEvent {
  Data = 'data',
  Error = 'error',
  Done = 'done',
  Reconnect = 'reconnect',
}

export enum DemuxerDataType {
  AudioMetaData = 'audioMetaData',
  AACRawData = 'AACRawData',
  VideoMetaData = 'videoMetaData',
  NALU = 'NALU',
}

export enum TagType {
  Audio = 'audio',
  Video = 'video',
  ScriptData = 'script data',
  Unknown = 'unknown',
}

export interface TagHeader {
  tagType: TagType;
  tagDataSize: number;
  timestamp: number;
  streamId: number;
}

export interface VideoMetaData {
  frameType: number;
  codecId: number;
  AVCPacketType: number;
  compositionTime: number;
  pts: number;
  // if AVCPacketType === 0 will appear the follow infomation
  AVCDecoderConfigurationRecord?: AVCDecoderConfigurationRecord;
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

export interface AudioMetaData {
  soundFormat: number;
  soundRate: number;
  soundSize: number;
  soundType: number;
  aacPacketType: number;
  audioSpecificConfig: AudioSpecificConfig;
}

export type AudioSpecificConfig = {
  audioObjectType: number;
  samplingFrequencyIndex: number;
  channelConfiguration: number;
};
