import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TranscriptDocument = Transcript & Document;

export enum TranscriptSource {
  MICROSOFT = 'microsoft',
  MANUAL_UPLOAD = 'manual_upload',
}

interface StructuredEntry {
  speaker: string;
  timestamp: string;
  text: string;
}

@Schema({
  timestamps: true,
  collection: 'transcripts',
})
export class Transcript {
  @Prop({ type: Types.ObjectId, ref: 'Meeting', required: true, index: true })
  meetingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ nullable: true })
  microsoftTranscriptId?: string;

  @Prop({ required: true, type: String })
  content: string;

  @Prop({
    type: [
      {
        speaker: { type: String },
        timestamp: { type: String },
        text: { type: String },
      },
    ],
    default: [],
  })
  structuredContent: StructuredEntry[];

  @Prop({ default: 'en' })
  language: string;

  @Prop({
    type: String,
    enum: Object.values(TranscriptSource),
    default: TranscriptSource.MICROSOFT,
  })
  source: TranscriptSource;

  @Prop({ nullable: true })
  duration?: number;

  @Prop({ required: true, index: true })
  wordCount: number;

  @Prop({ default: () => new Date() })
  fetchedAt: Date;

  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop({ default: () => new Date() })
  updatedAt: Date;
}

export const TranscriptSchema = SchemaFactory.createForClass(Transcript);

TranscriptSchema.index({ meetingId: 1 });
TranscriptSchema.index({ userId: 1, createdAt: -1 });
TranscriptSchema.index({ source: 1 });
