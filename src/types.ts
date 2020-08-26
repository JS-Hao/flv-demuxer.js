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
