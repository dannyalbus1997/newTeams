import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';

interface OnlineMeeting {
  id: string;
  subject: string;
  createdDateTime: string;
  startDateTime: string;
  endDateTime: string;
  joinUrl: string;
  participants?: Participant[];
  isReminderOn?: boolean;
}

interface CalendarEvent {
  id: string;
  subject: string;
  bodyPreview: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  organizer: Person;
  attendees: Attendee[];
  onlineMeeting?: OnlineMeeting;
  onlineMeetingUrl?: string;
  isOnlineMeeting?: boolean;
}

interface Participant {
  identity: IdentitySet;
  upn: string;
  role: string;
}

interface IdentitySet {
  application?: Identity;
  device?: Identity;
  user?: Identity;
}

interface Identity {
  id: string;
  displayName: string;
}

interface Person {
  emailAddress: EmailAddress;
  displayName: string;
}

interface Attendee {
  emailAddress: EmailAddress;
  type: string;
  status: { response: string; time: string };
}

interface EmailAddress {
  address: string;
  name: string;
}

interface Transcript {
  id: string;
  createdDateTime: string;
  content: string;
  contentFormat: string;
}

@Injectable()
export class MicrosoftGraphService {
  private readonly logger = new Logger(MicrosoftGraphService.name);

  getGraphClient(accessToken: string): Client {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
    return client;
  }

  async getUserProfile(
    accessToken: string,
  ): Promise<{ id: string; displayName: string; mail: string; jobTitle: string; userPrincipalName: string }> {
    try {
      const client = this.getGraphClient(accessToken);
      const user = await client
        .api('/me')
        .select(['id', 'displayName', 'mail', 'jobTitle', 'userPrincipalName'])
        .get();
      return user;
    } catch (error) {
      this.logger.error('Failed to fetch user profile', error);
      throw error;
    }
  }

  async getCalendarEvents(
    accessToken: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    try {
      const client = this.getGraphClient(accessToken);
      const events = await client
        .api('/me/calendarview')
        .query({
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
        })
        .select([
          'id',
          'subject',
          'start',
          'end',
          'organizer',
          'attendees',
          'onlineMeeting',
          'onlineMeetingUrl',
          'isOnlineMeeting',
          'bodyPreview',
        ])
        .get();

      return events.value as CalendarEvent[];
    } catch (error) {
      this.logger.error('Failed to fetch calendar events', error);
      throw error;
    }
  }

  async getOnlineMeetings(accessToken: string): Promise<OnlineMeeting[]> {
    try {
      const client = this.getGraphClient(accessToken);
      const meetings = await client
        .api('/me/onlineMeetings')
        .get();

      return meetings.value as OnlineMeeting[];
    } catch (error) {
      this.logger.error('Failed to fetch online meetings', error);
      return [];
    }
  }

  async getMeetingTranscripts(
    accessToken: string,
    meetingId: string,
  ): Promise<Transcript[]> {
    try {
      const client = this.getGraphClient(accessToken);
      const transcripts = await client
        .api(`/me/onlineMeetings/${meetingId}/transcripts`)
        .get();

      return transcripts.value as Transcript[];
    } catch (error) {
      this.logger.error(
        `Failed to fetch transcripts for meeting ${meetingId}`,
        error,
      );
      throw error;
    }
  }

  async getTranscriptContent(
    accessToken: string,
    meetingId: string,
    transcriptId: string,
  ): Promise<string> {
    try {
      const client = this.getGraphClient(accessToken);
      const transcript = await client
        .api(`/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}`)
        .get();

      return transcript.content || '';
    } catch (error) {
      this.logger.error(
        `Failed to fetch transcript content for meeting ${meetingId}`,
        error,
      );
      throw error;
    }
  }

  async checkTranscriptAvailability(
    accessToken: string,
    meetingId: string,
  ): Promise<boolean> {
    try {
      const transcripts = await this.getMeetingTranscripts(
        accessToken,
        meetingId,
      );
      return transcripts && transcripts.length > 0;
    } catch {
      return false;
    }
  }

  async getRecordings(accessToken: string, meetingId: string): Promise<any[]> {
    try {
      const client = this.getGraphClient(accessToken);
      const recordings = await client
        .api(`/me/onlineMeetings/${meetingId}/recordings`)
        .get();

      return recordings.value || [];
    } catch (error) {
      this.logger.debug(`No recordings available for meeting ${meetingId}`);
      return [];
    }
  }
}
