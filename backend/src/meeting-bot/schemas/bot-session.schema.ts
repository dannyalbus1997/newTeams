import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BotSessionDocument = BotSession & Document;

export enum BotSessionStatus {
  /** Bot is being set up and preparing to join */
  INITIALIZING = 'initializing',
  /** Bot has joined the meeting and is waiting */
  JOINED = 'joined',
  /** Bot is actively recording the meeting */
  RECORDING = 'recording',
  /** Meeting ended or bot was told to leave; recording saved */
  RECORDING_COMPLETE = 'recording_complete',
  /** Recording is being transcribed via Whisper */
  TRANSCRIBING = 'transcribing',
  /** Transcript is being summarized via GPT */
  SUMMARIZING = 'summarizing',
  /** Full pipeline finished (record → transcribe → summarize) */
  COMPLETED = 'completed',
  /** Something went wrong */
  ERROR = 'error',
  /** Bot was manually removed from the meeting */
  CANCELLED = 'cancelled',
}

@Schema({
  timestamps: true,
  collection: 'bot_sessions',
})
export class BotSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Meeting' })
  meetingId?: Types.ObjectId;

  /** The Microsoft Graph call ID returned when the bot joins */
  @Prop({ nullable: true })
  callId?: string;

  /** The Teams online meeting ID the bot joined */
  @Prop({ required: true })
  microsoftMeetingId: string;

  /** The join URL used to enter the meeting */
  @Prop({ required: true })
  joinUrl: string;

  /** Display name shown in the meeting participant list */
  @Prop({ default: 'Meeting Assistant Bot' })
  botDisplayName: string;

  @Prop({
    type: String,
    enum: Object.values(BotSessionStatus),
    default: BotSessionStatus.INITIALIZING,
  })
  status: BotSessionStatus;

  /** Path to the recorded file on disk (temporary) */
  @Prop({ nullable: true })
  recordingFilePath?: string;

  /** Size of the recording in bytes */
  @Prop({ nullable: true })
  recordingSize?: number;

  /** Duration of the recording in seconds */
  @Prop({ nullable: true })
  recordingDuration?: number;

  /** Reference to the transcript created from this bot session */
  @Prop({ type: Types.ObjectId, ref: 'Transcript', nullable: true })
  transcriptId?: Types.ObjectId;

  /** Human-readable progress message for the frontend */
  @Prop({ default: '' })
  progressMessage: string;

  /** 0-100 progress percentage */
  @Prop({ default: 0 })
  progressPercent: number;

  /** Error details if status is ERROR */
  @Prop({ nullable: true })
  errorMessage?: string;

  @Prop({ nullable: true })
  joinedAt?: Date;

  @Prop({ nullable: true })
  recordingStartedAt?: Date;

  @Prop({ nullable: true })
  recordingEndedAt?: Date;

  @Prop({ nullable: true })
  completedAt?: Date;

  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop({ default: () => new Date() })
  updatedAt: Date;
}

export const BotSessionSchema = SchemaFactory.createForClass(BotSession);

BotSessionSchema.index({ userId: 1, createdAt: -1 });
BotSessionSchema.index({ callId: 1 });
BotSessionSchema.index({ status: 1 });
BotSessionSchema.index({ microsoftMeetingId: 1 });
