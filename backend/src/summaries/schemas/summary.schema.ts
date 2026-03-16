import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SummaryDocument = Summary & Document;

export enum ActionItemStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum ActionItemPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

interface KeyDiscussionPoint {
  topic: string;
  details: string;
  speakers: string[];
}

interface ActionItem {
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: ActionItemPriority;
  status: ActionItemStatus;
}

interface Decision {
  decision: string;
  context: string;
  madeBy?: string;
}

interface FollowUp {
  item: string;
  responsible?: string;
  deadline?: string;
}

interface Sentiment {
  overall: string;
  score: number;
}

interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

@Schema({
  timestamps: true,
  collection: 'summaries',
})
export class Summary {
  @Prop({ type: Types.ObjectId, ref: 'Meeting', required: true, index: true })
  meetingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Transcript', nullable: true })
  transcriptId?: Types.ObjectId;

  @Prop({ required: true })
  overview: string;

  @Prop({
    type: [
      {
        topic: { type: String },
        details: { type: String },
        speakers: [String],
      },
    ],
    default: [],
  })
  keyDiscussionPoints: KeyDiscussionPoint[];

  @Prop({
    type: [
      {
        description: { type: String },
        assignee: { type: String, nullable: true },
        dueDate: { type: String, nullable: true },
        priority: {
          type: String,
          enum: Object.values(ActionItemPriority),
          default: ActionItemPriority.MEDIUM,
        },
        status: {
          type: String,
          enum: Object.values(ActionItemStatus),
          default: ActionItemStatus.PENDING,
        },
      },
    ],
    default: [],
  })
  actionItems: ActionItem[];

  @Prop({
    type: [
      {
        decision: { type: String },
        context: { type: String },
        madeBy: { type: String, nullable: true },
      },
    ],
    default: [],
  })
  decisions: Decision[];

  @Prop({
    type: [
      {
        item: { type: String },
        responsible: { type: String, nullable: true },
        deadline: { type: String, nullable: true },
      },
    ],
    default: [],
  })
  followUps: FollowUp[];

  @Prop({
    type: {
      overall: { type: String },
      score: { type: Number, min: 0, max: 1 },
    },
    default: { overall: 'neutral', score: 0.5 },
  })
  sentiment: Sentiment;

  @Prop({ type: [String], default: [] })
  topics: string[];

  @Prop({ nullable: true })
  duration?: number;

  @Prop({ default: 'gpt-4o' })
  model: string;

  @Prop({
    type: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    default: { prompt: 0, completion: 0, total: 0 },
  })
  tokenUsage: TokenUsage;

  @Prop({ default: 1 })
  version: number;

  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop({ default: () => new Date() })
  updatedAt: Date;
}

export const SummarySchema = SchemaFactory.createForClass(Summary);

SummarySchema.index({ meetingId: 1 });
SummarySchema.index({ userId: 1, createdAt: -1 });
SummarySchema.index({ 'topics': 1 });
SummarySchema.index({ createdAt: -1 });
