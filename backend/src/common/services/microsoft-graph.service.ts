import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';

interface OnlineMeeting {
  id: string;
  subject: string;
  createdDateTime: string;
  startDateTime: string;
  endDateTime: string;
  joinUrl?: string;
  joinWebUrl?: string;
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
    return this.getCalendarEventsForUser(
      accessToken,
      'me',
      startDate,
      endDate,
    );
  }

  /** Calendar view for a specific user (use 'me' for delegated or user id for app-only). */
  async getCalendarEventsForUser(
    accessToken: string,
    userIdentifier: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    try {
      const client = this.getGraphClient(accessToken);
      const events = await client
        .api(`/users/${userIdentifier}/calendarview`)
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
    // Delegated token path
    try {
      const client = this.getGraphClient(accessToken);
      const meetings = await client.api('/me/onlineMeetings').get();
      return meetings.value as OnlineMeeting[];
    } catch (error) {
      this.logger.error('Failed to fetch online meetings', error);
      return [];
    }
  }

  /** Online meetings for a specific user (use 'me' for delegated or user id for app-only). */
  async getOnlineMeetingsForUser(
    accessToken: string,
    userIdentifier: string,
  ): Promise<OnlineMeeting[]> {
    try {
      const client = this.getGraphClient(accessToken);
      const meetings = await client
        // App-only (or delegated with explicit user): use /users/{id}/...
        .api(`/users/${userIdentifier}/onlineMeetings`)
        .get();

      return meetings.value as OnlineMeeting[];
    } catch (error) {
      this.logger.error('Failed to fetch online meetings', error);
      return [];
    }
  }

  /**
   * Resolve online meeting id from join URL (e.g. when only calendar event id is stored).
   * Returns the online meeting id or null.
   *
   * Tries multiple strategies in order:
   *  1. Filter by joinWebUrl using /users/{organizerId}/... (organizer ID from URL context)
   *  2. Filter by joinWebUrl using /me/onlineMeetings (delegated, works when caller is organizer)
   *  3. List all meetings for the organizer and match by decoded URL comparison
   */
  async getOnlineMeetingIdByJoinUrl(
    accessToken: string,
    joinWebUrl?: string,
  ): Promise<string | null> {
    if (!joinWebUrl) return null;

    const client = this.getGraphClient(accessToken);

    // Extract organizer AAD object ID from the URL context parameter (Oid field)
    let organizerAadId: string | undefined;
    try {
      const url = new URL(joinWebUrl);
      const contextParam = url.searchParams.get('context');
      if (contextParam) {
        const context = JSON.parse(decodeURIComponent(contextParam)) as Record<string, string>;
        organizerAadId = context.Oid || context.oid;
      }
    } catch {
      // ignore URL/JSON parse errors
    }

    const escaped = joinWebUrl.replace(/'/g, "''");
    const decodedTarget = decodeURIComponent(joinWebUrl).toLowerCase();

    // Strategy 1: Filter by joinWebUrl scoped to the organizer's user ID (most reliable)
    if (organizerAadId) {
      for (const version of ['v1.0', 'beta'] as const) {
        try {
          const apiCall = client
            .api(`/users/${organizerAadId}/onlineMeetings`)
            .query({ $filter: `joinWebUrl eq '${escaped}'` });

          if (version === 'beta') apiCall.version('beta');

          const result = await apiCall.get();
          const meetings = result?.value as OnlineMeeting[] | undefined;
          if (meetings?.length) {
            this.logger.log(`Resolved meeting ID via /users/{oid} filter (${version}): ${meetings[0].id}`);
            return meetings[0].id;
          }
        } catch (error) {
          this.logger.debug(`Strategy 1 (filter, ${version}, /users/{oid}) failed`, error);
        }
      }
    }

    // Strategy 2: Filter by joinWebUrl on /me/onlineMeetings (works when caller is the organizer)
    for (const version of ['v1.0', 'beta'] as const) {
      try {
        const apiCall = client
          .api('/me/onlineMeetings')
          .query({ $filter: `joinWebUrl eq '${escaped}'` });

        if (version === 'beta') apiCall.version('beta');

        const result = await apiCall.get();
        const meetings = result?.value as OnlineMeeting[] | undefined;
        if (meetings?.length) {
          this.logger.log(`Resolved meeting ID via /me filter (${version}): ${meetings[0].id}`);
          return meetings[0].id;
        }
      } catch (error) {
        this.logger.debug(`Strategy 2 (filter, ${version}, /me) failed`, error);
      }
    }

    // Strategy 3: List organizer's meetings and match by decoded URL comparison
    const listEndpoint = organizerAadId
      ? `/users/${organizerAadId}/onlineMeetings`
      : '/me/onlineMeetings';
    try {
      const result = await client.api(listEndpoint).version('beta').get();
      const meetings = result?.value as OnlineMeeting[] | undefined;
      if (meetings?.length) {
        const match = meetings.find((m) => {
          const mUrl = m.joinWebUrl || m.joinUrl || '';
          return decodeURIComponent(mUrl).toLowerCase() === decodedTarget;
        });
        if (match) {
          this.logger.log(`Resolved meeting ID via URL list comparison: ${match.id}`);
          return match.id;
        }
      }
    } catch (error) {
      this.logger.debug('Strategy 3 (URL list comparison) failed', error);
    }

    this.logger.warn(`Could not resolve online meeting ID for joinUrl: ${joinWebUrl}`);
    return null;
  }

  async getMeetingTranscripts(
    accessToken: string,
    meetingId?: string,
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
      const content = await client
        .api(`/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content`)
        .header('Accept', 'text/vtt')
        .responseType('text' as any)
        .get();

      return content || '';
    } catch (error) {
      this.logger.error(
        `Failed to fetch transcript content for meeting ${meetingId}`,
        error,
      );
      throw error;
    }
  }

  /** App-only: list transcripts for a user's meeting (requires OnlineMeetingTranscript.Read.All). */
  async getMeetingTranscriptsForUser(
    accessToken: string,
    userMicrosoftId: string,
    microsoftMeetingId: string,
  ): Promise<Transcript[]> {
    try {
      const client = this.getGraphClient(accessToken);
      const transcripts = await client
        .api(`/users/${userMicrosoftId}/onlineMeetings/${microsoftMeetingId}/transcripts`)
        .get();
      return transcripts.value as Transcript[];
    } catch (error) {
      this.logger.error(
        `Failed to fetch transcripts for user meeting ${microsoftMeetingId}`,
        error,
      );
      throw error;
    }
  }

  /** App-only: get transcript content for a user's meeting. */
  async getTranscriptContentForUser(
    accessToken: string,
    userMicrosoftId: string,
    microsoftMeetingId: string,
    transcriptId: string,
  ): Promise<string> {
    try {
      const client = this.getGraphClient(accessToken);
      const content = await client
        .api(`/users/${userMicrosoftId}/onlineMeetings/${microsoftMeetingId}/transcripts/${transcriptId}/content`)
        .header('Accept', 'text/vtt')
        .responseType('text' as any)
        .get();
      return content || '';
    } catch (error) {
      this.logger.error(
        `Failed to fetch transcript content for meeting ${microsoftMeetingId}`,
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

  /** App-only: check transcript availability for a specific user's meeting. */
  async checkTranscriptAvailabilityForUser(
    accessToken: string,
    userMicrosoftId: string,
    meetingId: string,
  ): Promise<boolean> {
    try {
      const transcripts = await this.getMeetingTranscriptsForUser(
        accessToken,
        userMicrosoftId,
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

  /** App-only: get recordings for a specific user's meeting. */
  async getRecordingsForUser(
    accessToken: string,
    userMicrosoftId: string,
    meetingId: string,
  ): Promise<any[]> {
    try {
      const client = this.getGraphClient(accessToken);
      const recordings = await client
        .api(`/users/${userMicrosoftId}/onlineMeetings/${meetingId}/recordings`)
        .get();

      return recordings.value || [];
    } catch (error) {
      this.logger.debug(`No recordings available for user meeting ${meetingId}`);
      return [];
    }
  }
}
