import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import {
  Summary,
  SummaryDocument,
  ActionItemStatus,
  ActionItemPriority,
} from './schemas/summary.schema';
import { SearchQueryDto } from './dto/search-query.dto';
import { UpdateActionItemDto } from './dto/update-action-item.dto';
import { TranscriptsService } from '@/transcripts/transcripts.service';
import { MeetingsService } from '@/meetings/meetings.service';
import { AppConfig } from '@/config/configuration';
import { PaginatedResponse } from '@/common/interfaces/pagination.interface';

interface SummaryResponse {
  overview: string;
  keyDiscussionPoints: Array<{
    topic: string;
    details: string;
    speakers: string[];
  }>;
  actionItems: Array<{
    description: string;
    assignee?: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  decisions: Array<{
    decision: string;
    context: string;
    madeBy?: string;
  }>;
  followUps: Array<{
    item: string;
    responsible?: string;
    deadline?: string;
  }>;
  sentiment: {
    overall: string;
    score: number;
  };
  topics: string[];
}

@Injectable()
export class SummariesService {
  private readonly logger = new Logger(SummariesService.name);
  private openai: OpenAI;

  constructor(
    @InjectModel(Summary.name)
    private summaryModel: Model<SummaryDocument>,
    private configService: ConfigService<AppConfig>,
    private transcriptsService: TranscriptsService,
    private meetingsService: MeetingsService,
  ) {
    const apiKey = this.configService.get('openai.apiKey', { infer: true });
    this.openai = new OpenAI({ apiKey });
  }

  private getSystemPrompt(): string {
    return `You are an expert meeting summarizer. Analyze the provided meeting transcript and generate a comprehensive summary in JSON format.

Your response must be valid JSON with the following structure:
{
  "overview": "A concise 2-3 sentence overview of the meeting",
  "keyDiscussionPoints": [
    {
      "topic": "Topic name",
      "details": "Detailed explanation of what was discussed",
      "speakers": ["Speaker name 1", "Speaker name 2"]
    }
  ],
  "actionItems": [
    {
      "description": "What needs to be done",
      "assignee": "Person responsible (optional)",
      "dueDate": "Due date if mentioned (optional)",
      "priority": "high|medium|low",
      "status": "pending|in_progress|completed"
    }
  ],
  "decisions": [
    {
      "decision": "The decision made",
      "context": "Why this decision was made",
      "madeBy": "Who made the decision (optional)"
    }
  ],
  "followUps": [
    {
      "item": "Follow-up item",
      "responsible": "Person responsible (optional)",
      "deadline": "When it should be done (optional)"
    }
  ],
  "sentiment": {
    "overall": "positive|neutral|negative",
    "score": 0.5
  },
  "topics": ["topic1", "topic2", "topic3"]
}

Important:
- Extract ALL action items and decisions
- Use actual names of speakers when mentioned
- Assign accurate priority levels to action items
- Identify and extract topics discussed
- Keep descriptions concise but comprehensive
- Ensure JSON is valid and properly formatted`;
  }

  async generateSummary(
    userId: string,
    meetingId: string,
  ): Promise<Summary> {
    try {
      const startTime = Date.now();

      const meeting = await this.meetingsService.getMeetingById(userId, meetingId);
      if (!meeting) {
        throw new BadRequestException('Meeting not found');
      }

      let transcript = await this.transcriptsService.getTranscriptByUserId(
        userId,
        meetingId,
      );

      if (!transcript) {
        transcript = await this.transcriptsService.fetchTranscript(
          userId,
          meetingId,
        );
      }

      if (!transcript || !transcript.content) {
        throw new BadRequestException('No transcript available for this meeting');
      }

      const userMessage = `Please analyze this meeting transcript and provide a detailed summary:

Meeting Subject: ${meeting.subject}
Meeting Date: ${meeting.startDateTime.toLocaleDateString()}
Duration: ${Math.round((meeting.endDateTime.getTime() - meeting.startDateTime.getTime()) / 60000)} minutes

Transcript:
${transcript.content}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new BadRequestException('Failed to generate summary');
      }

      let summaryData: SummaryResponse;
      try {
        summaryData = JSON.parse(content);
      } catch (error) {
        this.logger.error('Failed to parse OpenAI response', error);
        throw new BadRequestException('Failed to parse summary response');
      }

      const duration = Date.now() - startTime;

      const existingSummary = await this.summaryModel.findOne({
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
      });

      if (existingSummary) {
        existingSummary.overview = summaryData.overview;
        existingSummary.keyDiscussionPoints = summaryData.keyDiscussionPoints;
        existingSummary.actionItems = summaryData.actionItems.map((ai) => ({
          ...ai,
          priority: (ai.priority || 'medium') as ActionItemPriority,
          status: (ai.status || 'pending') as ActionItemStatus,
        }));
        existingSummary.decisions = summaryData.decisions;
        existingSummary.followUps = summaryData.followUps;
        existingSummary.sentiment = summaryData.sentiment;
        existingSummary.topics = summaryData.topics;
        existingSummary.duration = duration;
        existingSummary.version = (existingSummary.version || 1) + 1;
        existingSummary.tokenUsage = {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        };
        existingSummary.updatedAt = new Date();

        await (existingSummary as any).save();
        return existingSummary;
      }

      const summary = await this.summaryModel.create({
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
        transcriptId: (transcript as any)._id,
        overview: summaryData.overview,
        keyDiscussionPoints: summaryData.keyDiscussionPoints,
        actionItems: summaryData.actionItems.map((ai) => ({
          ...ai,
          priority: (ai.priority || 'medium') as ActionItemPriority,
          status: (ai.status || 'pending') as ActionItemStatus,
        })),
        decisions: summaryData.decisions,
        followUps: summaryData.followUps,
        sentiment: summaryData.sentiment,
        topics: summaryData.topics,
        duration,
        tokenUsage: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      });

      return summary;
    } catch (error) {
      this.logger.error(`Failed to generate summary for meeting ${meetingId}`, error);
      throw error;
    }
  }

  async regenerateSummary(
    userId: string,
    meetingId: string,
  ): Promise<Summary> {
    const existingSummary = await this.summaryModel.findOne({
      meetingId: new Types.ObjectId(meetingId),
      userId: new Types.ObjectId(userId),
    });

    if (existingSummary) {
      await this.summaryModel.deleteOne({ _id: existingSummary._id });
    }

    return this.generateSummary(userId, meetingId);
  }

  async getSummary(meetingId: string): Promise<Summary | null> {
    return this.summaryModel.findOne({
      meetingId: new Types.ObjectId(meetingId),
    });
  }

  async getSummaryByUserId(
    userId: string,
    meetingId: string,
  ): Promise<Summary | null> {
    return this.summaryModel.findOne({
      meetingId: new Types.ObjectId(meetingId),
      userId: new Types.ObjectId(userId),
    });
  }

  async searchSummaries(
    userId: string,
    query: SearchQueryDto,
  ): Promise<PaginatedResponse<Summary>> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      const searchFilter = {
        userId: new Types.ObjectId(userId),
        $or: [
          { overview: { $regex: query.q, $options: 'i' } },
          { 'keyDiscussionPoints.topic': { $regex: query.q, $options: 'i' } },
          { 'actionItems.description': { $regex: query.q, $options: 'i' } },
          { 'decisions.decision': { $regex: query.q, $options: 'i' } },
          { 'topics': { $regex: query.q, $options: 'i' } },
        ],
      };

      const sortField: string = query.sortBy === 'relevance' ? 'createdAt' : (query.sortBy || 'createdAt');
      const sort = { [sortField]: -1 } as any;

      const [data, total] = await Promise.all([
        this.summaryModel
          .find(searchFilter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.summaryModel.countDocuments(searchFilter),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNextPage: page < pages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to search summaries for user ${userId}`, error);
      throw error;
    }
  }

  async updateActionItemStatus(
    userId: string,
    meetingId: string,
    index: number,
    updateDto: UpdateActionItemDto,
  ): Promise<Summary> {
    const summary = await this.getSummaryByUserId(userId, meetingId);

    if (!summary) {
      throw new BadRequestException('Summary not found');
    }

    if (index < 0 || index >= summary.actionItems.length) {
      throw new BadRequestException('Invalid action item index');
    }

    const actionItem = summary.actionItems[index];
    if (updateDto.status) {
      actionItem.status = updateDto.status;
    }
    if (updateDto.priority) {
      actionItem.priority = updateDto.priority;
    }
    if (updateDto.assignee !== undefined) {
      actionItem.assignee = updateDto.assignee;
    }
    if (updateDto.dueDate !== undefined) {
      actionItem.dueDate = updateDto.dueDate;
    }
    if (updateDto.description !== undefined) {
      actionItem.description = updateDto.description;
    }

    summary.actionItems[index] = actionItem;
    summary.updatedAt = new Date();

    await (summary as any).save();
    return summary;
  }

  async exportSummaryPdf(
    userId: string,
    meetingId: string,
  ): Promise<Readable> {
    try {
      const summary = await this.getSummaryByUserId(userId, meetingId);
      if (!summary) {
        throw new BadRequestException('Summary not found');
      }

      const meeting = await this.meetingsService.getMeetingById(userId, meetingId);
      if (!meeting) {
        throw new BadRequestException('Meeting not found');
      }

      const doc = new PDFDocument();
      const stream = new Readable();

      doc.on('data', (chunk) => {
        stream.push(chunk);
      });

      doc.on('end', () => {
        stream.push(null);
      });

      doc.fontSize(20).text(meeting.subject, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Date: ${meeting.startDateTime.toLocaleDateString()}`);
      doc.text(`Duration: ${Math.round((meeting.endDateTime.getTime() - meeting.startDateTime.getTime()) / 60000)} minutes`);
      doc.text(
        `Organizer: ${meeting.organizer.name} <${meeting.organizer.email}>`,
      );

      doc.moveDown();
      doc.fontSize(16).text('Overview', { underline: true });
      doc.fontSize(11).text(summary.overview);

      if (summary.keyDiscussionPoints.length > 0) {
        doc.moveDown();
        doc.fontSize(16).text('Key Discussion Points', { underline: true });
        for (const point of summary.keyDiscussionPoints) {
          doc.fontSize(12).text(point.topic, { underline: true });
          doc.fontSize(11).text(point.details);
          doc.text(`Speakers: ${point.speakers.join(', ')}`);
          doc.moveDown(0.5);
        }
      }

      if (summary.actionItems.length > 0) {
        doc.moveDown();
        doc.fontSize(16).text('Action Items', { underline: true });
        for (let i = 0; i < summary.actionItems.length; i++) {
          const ai = summary.actionItems[i];
          doc.fontSize(12).text(`${i + 1}. ${ai.description}`);
          const details: string[] = [];
          if (ai.assignee) details.push(`Assigned to: ${ai.assignee}`);
          if (ai.dueDate) details.push(`Due: ${ai.dueDate}`);
          details.push(`Priority: ${ai.priority}`);
          details.push(`Status: ${ai.status}`);
          doc.fontSize(10).text(details.join(' | '));
          doc.moveDown(0.5);
        }
      }

      if (summary.decisions.length > 0) {
        doc.moveDown();
        doc.fontSize(16).text('Decisions', { underline: true });
        for (const decision of summary.decisions) {
          doc.fontSize(12).text(`• ${decision.decision}`);
          doc.fontSize(10).text(`Context: ${decision.context}`);
          if (decision.madeBy) {
            doc.text(`Made by: ${decision.madeBy}`);
          }
          doc.moveDown(0.5);
        }
      }

      if (summary.topics.length > 0) {
        doc.moveDown();
        doc.fontSize(16).text('Topics Discussed', { underline: true });
        doc.fontSize(11).text(summary.topics.join(', '));
      }

      doc.end();

      return stream;
    } catch (error) {
      this.logger.error(
        `Failed to export summary as PDF for meeting ${meetingId}`,
        error,
      );
      throw error;
    }
  }

  async getSummaryStats(userId: string): Promise<{
    totalSummaries: number;
    averageActionItems: number;
    topTopics: string[];
  }> {
    const summaries = await this.summaryModel.find({
      userId: new Types.ObjectId(userId),
    });

    const allTopics: string[] = [];
    let totalActionItems = 0;

    for (const summary of summaries) {
      totalActionItems += summary.actionItems.length;
      allTopics.push(...summary.topics);
    }

    const topicCounts: Record<string, number> = {};
    for (const topic of allTopics) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic]) => topic);

    return {
      totalSummaries: summaries.length,
      averageActionItems:
        summaries.length > 0 ? Math.round(totalActionItems / summaries.length) : 0,
      topTopics,
    };
  }
}
