import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Meeting,
  MeetingDocument,
  TranscriptStatus,
  SummaryStatus,
} from './schemas/meeting.schema';
import { MeetingQueryDto } from './dto/meeting-query.dto';
import { UsersService } from '@/users/users.service';
import { AuthService } from '@/auth/auth.service';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';
import { PaginatedResponse } from '@/common/interfaces/pagination.interface';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    @InjectModel(Meeting.name) private meetingModel: Model<MeetingDocument>,
    private usersService: UsersService,
    private authService: AuthService,
    private microsoftGraphService: MicrosoftGraphService,
  ) {}

  /**
   * Get a valid (non-expired) Microsoft access token for the user.
   * Automatically refreshes the token if it has expired.
   */
  private async getValidAccessToken(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const now = new Date();
    // Add 5-minute buffer so we refresh before actual expiry
    const bufferMs = 5 * 60 * 1000;
    const isExpired = user.tokenExpiresAt.getTime() - bufferMs < now.getTime();

    if (isExpired) {
      this.logger.log(`Access token expired for user ${userId}, refreshing...`);
      try {
        const refreshToken = await this.usersService.getDecryptedRefreshToken(user);
        const tokens = await this.authService.refreshAccessToken(refreshToken);

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiresIn);

        await this.usersService.updateTokens(
          userId,
          tokens.accessToken,
          tokens.refreshToken,
          expiresAt,
        );

        return tokens.accessToken;
      } catch (error) {
        this.logger.error(`Token refresh failed for user ${userId}`, error);
        throw new BadRequestException(
          'Microsoft session expired. Please sign out and sign in again.',
        );
      }
    }

    return this.usersService.getDecryptedAccessToken(user);
  }

  async syncMeetings(userId: string): Promise<number> {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }
      if (!user.microsoftId) {
        throw new BadRequestException(
          'User has no Microsoft identity. Sign in again with Microsoft.',
        );
      }

      const appAccessToken = await this.authService.getAppAccessToken();

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const [calendarEvents, recordings] = await Promise.all([
        this.microsoftGraphService.getCalendarEventsForUser(
          appAccessToken,
          user.microsoftId,
          thirtyDaysAgo,
          ninetyDaysLater,
        ),
        this.microsoftGraphService.getOnlineMeetingsForUser(
          appAccessToken,
          user.microsoftId,
        ),
      ]);

      let syncedCount = 0;

      const teamsCalendarEvents = calendarEvents.filter((event: any) => {
        return (
          event.isOnlineMeeting ||
          event.onlineMeetingUrl ||
          (event.categories && event.categories.includes('Teams'))
        );
      });

      for (const event of teamsCalendarEvents) {
        const recordingAvailable = recordings.some(
          (r: any) => r.meetingId === event.id || r.subject === event.subject,
        );

        const hasTranscript = event.isOnlineMeeting || !!event.onlineMeetingUrl;

        const meeting = await this.meetingModel.findOneAndUpdate(
          { microsoftMeetingId: event.id },
          {
            userId: new Types.ObjectId(userId),
            microsoftMeetingId: event.id,
            subject: event.subject,
            organizer: {
              name: event.organizer?.emailAddress?.name || 'Unknown',
              email: event.organizer?.emailAddress?.address || 'unknown@example.com',
            },
            participants: event.attendees?.map((a: any) => ({
              name: a.emailAddress?.name || 'Unknown',
              email: a.emailAddress?.address || 'unknown@example.com',
              role: a.type || 'attendee',
            })) || [],
            startDateTime: new Date(event.start.dateTime),
            endDateTime: new Date(event.end.dateTime),
            joinUrl: event.onlineMeetingUrl || undefined,
            hasTranscript: hasTranscript,
            hasRecording: recordingAvailable,
            transcriptStatus: hasTranscript ? TranscriptStatus.AVAILABLE : TranscriptStatus.NONE,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          },
          { upsert: true, new: true },
        );

        if (meeting) {
          syncedCount++;
        }
      }

      return syncedCount;
    } catch (error) {
      this.logger.error(`Failed to sync meetings for user ${userId}`, error);
      throw error;
    }
  }

  async getMeetings(
    userId: string,
    query: MeetingQueryDto,
  ): Promise<PaginatedResponse<Meeting>> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      const filter: any = { userId: new Types.ObjectId(userId) };

      if (query.startDate || query.endDate) {
        filter.startDateTime = {};
        if (query.startDate) {
          filter.startDateTime.$gte = new Date(query.startDate);
        }
        if (query.endDate) {
          filter.startDateTime.$lte = new Date(query.endDate);
        }
      }

      if (query.searchTerm) {
        filter.$or = [
          { subject: { $regex: query.searchTerm, $options: 'i' } },
          { 'organizer.name': { $regex: query.searchTerm, $options: 'i' } },
          { 'organizer.email': { $regex: query.searchTerm, $options: 'i' } },
        ];
      }

      if (query.transcriptStatus) {
        filter.transcriptStatus = query.transcriptStatus;
      }

      if (query.summaryStatus) {
        filter.summaryStatus = query.summaryStatus;
      }

      const sortField = query.sortBy || 'startDateTime';
      const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
      const sort = { [sortField]: sortOrder } as any;

      const [data, total] = await Promise.all([
        this.meetingModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.meetingModel.countDocuments(filter),
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
      this.logger.error(`Failed to get meetings for user ${userId}`, error);
      throw error;
    }
  }

  async getMeetingById(userId: string, meetingId: string): Promise<Meeting> {
    const meeting = await this.meetingModel.findOne({
      _id: meetingId,
      userId: new Types.ObjectId(userId),
    });

    if (!meeting) {
      throw new BadRequestException('Meeting not found');
    }

    return meeting;
  }

  async updateMeetingTranscriptStatus(
    userId: string,
    meetingId: string,
    status: TranscriptStatus,
  ): Promise<Meeting> {
    const meeting = await this.meetingModel.findOneAndUpdate(
      {
        _id: meetingId,
        userId: new Types.ObjectId(userId),
      },
      {
        transcriptStatus: status,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!meeting) {
      throw new BadRequestException('Meeting not found');
    }

    return meeting;
  }

  async updateMeetingSummaryStatus(
    userId: string,
    meetingId: string,
    status: SummaryStatus,
  ): Promise<Meeting> {
    const meeting = await this.meetingModel.findOneAndUpdate(
      {
        _id: meetingId,
        userId: new Types.ObjectId(userId),
      },
      {
        summaryStatus: status,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!meeting) {
      throw new BadRequestException('Meeting not found');
    }

    return meeting;
  }

  async checkTranscriptAvailability(
    userId: string,
    meetingId: string,
  ): Promise<{ available: boolean; status: TranscriptStatus }> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      const meeting = await this.getMeetingById(userId, meetingId);

      const isAvailable = await this.microsoftGraphService.checkTranscriptAvailability(
        accessToken,
        meeting.microsoftMeetingId,
      );

      if (isAvailable && meeting.transcriptStatus === TranscriptStatus.NONE) {
        await this.updateMeetingTranscriptStatus(
          userId,
          meetingId,
          TranscriptStatus.AVAILABLE,
        );
      }

      return {
        available: isAvailable,
        status: isAvailable ? TranscriptStatus.AVAILABLE : meeting.transcriptStatus,
      };
    } catch (error) {
      this.logger.error(
        `Failed to check transcript availability for meeting ${meetingId}`,
        error,
      );
      throw error;
    }
  }

  async getMeetingsByStatus(
    userId: string,
    status: SummaryStatus,
  ): Promise<Meeting[]> {
    return this.meetingModel.find({
      userId: new Types.ObjectId(userId),
      summaryStatus: status,
    });
  }

  async getTotalMeetingsCount(userId: string): Promise<number> {
    return this.meetingModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
  }

  async getUpcomingMeetingsCount(userId: string): Promise<number> {
    return this.meetingModel.countDocuments({
      userId: new Types.ObjectId(userId),
      startDateTime: { $gte: new Date() },
    });
  }

  async getPastMeetingsCount(userId: string): Promise<number> {
    return this.meetingModel.countDocuments({
      userId: new Types.ObjectId(userId),
      startDateTime: { $lt: new Date() },
    });
  }

  async deleteMeeting(userId: string, meetingId: string): Promise<void> {
    const result = await this.meetingModel.deleteOne({
      _id: meetingId,
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new BadRequestException('Meeting not found');
    }
  }
}
