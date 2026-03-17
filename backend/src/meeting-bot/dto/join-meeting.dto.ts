import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JoinMeetingDto {
  @ApiProperty({
    description: 'The Teams meeting join URL (e.g. https://teams.microsoft.com/l/meetup-join/...)',
    example: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc123...',
  })
  @IsNotEmpty()
  @IsString()
  joinUrl: string;

  @ApiPropertyOptional({
    description: 'Display name the bot will use in the meeting participant list',
    default: 'Meeting Assistant Bot',
  })
  @IsOptional()
  @IsString()
  botDisplayName?: string;

  @ApiPropertyOptional({
    description: 'Internal meeting ID to link the bot session to an existing meeting record',
  })
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional({
    description: 'Whether to auto-transcribe the recording with Whisper after the meeting ends',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoTranscribe?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to auto-summarize the transcript with GPT after transcription',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoSummarize?: boolean;
}
