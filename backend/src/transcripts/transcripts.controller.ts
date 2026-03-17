import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { TranscriptsService } from './transcripts.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '@/common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';

@ApiTags('transcripts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transcripts')
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @Get(':meetingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get transcript (with summary) for a meeting' })
  @ApiResponse({ status: 200, description: 'Transcript retrieved successfully' })
  async getTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.transcriptsService.getTranscriptByUserId(user.sub, meetingId);
  }

  @Get(':meetingId/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get only the AI summary for a meeting transcript' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getTranscriptSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    const transcript = await this.transcriptsService.getTranscriptByUserId(user.sub, meetingId);

    if (!transcript) {
      throw new BadRequestException('No transcript found for this meeting');
    }

    if (!transcript.isSummarized || !transcript.summary) {
      throw new BadRequestException(
        'This transcript has not been summarized yet. Use the regenerate-summary endpoint.',
      );
    }

    return {
      meetingId,
      summary: transcript.summary,
      source: transcript.source,
      language: transcript.language,
      wordCount: transcript.wordCount,
    };
  }

  @Post(':meetingId/fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch transcript from Microsoft and auto-summarize with GPT' })
  @ApiResponse({ status: 200, description: 'Transcript fetched and summarized successfully' })
  async fetchTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.transcriptsService.fetchTranscript(user.sub, meetingId, true);
  }

  @Post(':meetingId/transcribe-whisper')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transcribe recording with Whisper and summarize with GPT',
    description:
      'Downloads the meeting recording from Teams, transcribes with OpenAI Whisper, ' +
      'then generates an AI summary using GPT-4o. Full pipeline in one call.',
  })
  @ApiQuery({
    name: 'summarize',
    required: false,
    type: Boolean,
    description: 'Whether to auto-summarize after transcription (default: true)',
  })
  @ApiResponse({ status: 200, description: 'Transcription and summarization completed' })
  @ApiResponse({ status: 400, description: 'No recording available or job already in progress' })
  async transcribeWithWhisper(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
    @Query('summarize') summarize?: string,
  ) {
    const autoSummarize = summarize !== 'false';
    return this.transcriptsService.transcribeWithWhisper(user.sub, meetingId, autoSummarize);
  }

  @Post(':meetingId/smart-fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Smart fetch: Microsoft transcript → Whisper fallback → GPT summary',
    description:
      'Tries the native Teams transcript first. If unavailable but a recording exists, ' +
      'falls back to Whisper transcription. Both paths auto-summarize with GPT-4o.',
  })
  @ApiResponse({ status: 200, description: 'Transcript fetched/transcribed and summarized' })
  async fetchOrTranscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.transcriptsService.fetchOrTranscribe(user.sub, meetingId);
  }

  @Post(':meetingId/regenerate-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Re-generate the GPT summary for an existing transcript',
    description:
      'Useful if the initial summarization was skipped or failed, or if you want a fresh summary.',
  })
  @ApiResponse({ status: 200, description: 'Summary regenerated successfully' })
  async regenerateSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.transcriptsService.regenerateSummary(user.sub, meetingId);
  }

  @Get(':meetingId/transcription-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the current transcription/summarization job status',
    description: 'Returns progress information for an active transcription + summarization job.',
  })
  @ApiResponse({ status: 200, description: 'Job status retrieved' })
  async getTranscriptionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    const status = this.transcriptsService.getTranscriptionJobStatus(
      user.sub,
      meetingId,
    );

    return {
      hasActiveJob: !!status && status.status !== 'completed' && status.status !== 'error',
      ...status,
    };
  }

  @Post(':meetingId/upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload transcript manually and auto-summarize',
    description: 'Upload a transcript file (.txt, .vtt, .srt) and optionally summarize with GPT.',
  })
  @ApiQuery({
    name: 'summarize',
    required: false,
    type: Boolean,
    description: 'Whether to auto-summarize after upload (default: true)',
  })
  @ApiResponse({ status: 201, description: 'Transcript uploaded and summarized' })
  async uploadTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('summarize') summarize?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    let format: 'text' | 'vtt' | 'srt' = 'text';
    if (file.originalname.endsWith('.vtt')) {
      format = 'vtt';
    } else if (file.originalname.endsWith('.srt')) {
      format = 'srt';
    }

    const autoSummarize = summarize !== 'false';
    const content = file.buffer.toString('utf-8');
    return this.transcriptsService.uploadTranscript(
      user.sub,
      meetingId,
      content,
      format,
      autoSummarize,
    );
  }

  @Delete(':meetingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete transcript and its summary' })
  @ApiResponse({ status: 204, description: 'Transcript deleted successfully' })
  async deleteTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    await this.transcriptsService.deleteTranscript(user.sub, meetingId);
  }
}
