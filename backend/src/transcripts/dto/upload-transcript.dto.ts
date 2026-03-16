import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum TranscriptFormat {
  TEXT = 'text',
  VTT = 'vtt',
  SRT = 'srt',
}

export class UploadTranscriptDto {
  @IsOptional()
  @IsString()
  format?: TranscriptFormat = TranscriptFormat.TEXT;

  @IsOptional()
  @IsString()
  language?: string = 'en';
}
