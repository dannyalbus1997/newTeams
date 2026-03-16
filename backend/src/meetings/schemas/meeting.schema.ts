import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MeetingDocument = Meeting & Document;

export enum TranscriptStatus {
  NONE = 'none',
  AVAILABLE = 'available',
  FETCHED = 'fetched',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum SummaryStatus {
  NONE = 'none',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

interface Organizer {
  name: string;
  email: string;
}

interface Participant {
  name: string;
  email: string;
  role: string;
}

@Schema({
  timestamps: true,
  collection: 'meetings',
})
export class Meeting {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  microsoftMeetingId: string;

  @Prop({ required: true })
  subject: string;

  @Prop({
    type: {
      name: { type: String },
      email: { type: String },
    },
    required: true,
  })
  organizer: Organizer;

  @Prop({
    type: [
      {
        name: { type: String },
        email: { type: String },
        role: { type: String },
      },
    ],
    default: [],
  })
  participants: Participant[];

  @Prop({ required: true, index: true })
  startDateTime: Date;

  @Prop({ required: true })
  endDateTime: Date;

  @Prop({ nullable: true })
  joinUrl?: string;

  @Prop({ default: false })
  hasTranscript: boolean;

  @Prop({ default: false })
  hasRecording: boolean;

  @Prop({
    type: String,
    enum: Object.values(TranscriptStatus),
    default: TranscriptStatus.NONE,
  })
  transcriptStatus: TranscriptStatus;

  @Prop({
    type: String,
    enum: Object.values(SummaryStatus),
    default: SummaryStatus.NONE,
  })
  summaryStatus: SummaryStatus;

  @Prop({ nullable: true })
  lastSyncedAt?: Date;

  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop({ default: () => new Date() })
  updatedAt: Date;
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);

MeetingSchema.index({ userId: 1, startDateTime: -1 });
MeetingSchema.index({ microsoftMeetingId: 1 });
MeetingSchema.index({ startDateTime: -1 });
MeetingSchema.index({ summaryStatus: 1 });
MeetingSchema.index({ transcriptStatus: 1 });
