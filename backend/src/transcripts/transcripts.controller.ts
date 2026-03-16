import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
  @ApiOperation({ summary: 'Get transcript for a meeting' })
  @ApiResponse({ status: 200, description: 'Transcript retrieved successfully' })
  async getTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.transcriptsService.getTranscriptByUserId(user.sub, meetingId);
  }

  @Post(':meetingId/fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch transcript from Microsoft' })
  @ApiResponse({
    status: 200,
    description: 'Transcript fetched successfully',
  })
  async fetchTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.transcriptsService.fetchTranscript(user.sub, meetingId);
  }

  @Post(':meetingId/upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload transcript manually' })
  @ApiResponse({
    status: 201,
    description: 'Transcript uploaded successfully',
  })
  async uploadTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
    @UploadedFile() file: Express.Multer.File,
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

    const content = file.buffer.toString('utf-8');
    return this.transcriptsService.uploadTranscript(
      user.sub,
      meetingId,
      content,
      format,
    );
  }

  @Delete(':meetingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete transcript' })
  @ApiResponse({ status: 204, description: 'Transcript deleted successfully' })
  async deleteTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    await this.transcriptsService.deleteTranscript(user.sub, meetingId);
  }
}
