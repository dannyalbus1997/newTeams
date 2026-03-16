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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { MeetingQueryDto } from './dto/meeting-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '@/common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';

@ApiTags('meetings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user meetings with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Meetings retrieved successfully' })
  async getMeetings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MeetingQueryDto,
  ) {
    return this.meetingsService.getMeetings(user.sub, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get single meeting by ID' })
  @ApiResponse({ status: 200, description: 'Meeting retrieved successfully' })
  async getMeetingById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.meetingsService.getMeetingById(user.sub, meetingId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchronize meetings from Microsoft' })
  @ApiResponse({
    status: 200,
    description: 'Meetings synchronized',
    schema: { example: { count: 5 } },
  })
  async syncMeetings(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.meetingsService.syncMeetings(user.sub);
    return { count, message: `${count} meetings synchronized` };
  }

  @Get(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check transcript/recording availability status' })
  @ApiResponse({
    status: 200,
    description: 'Status checked successfully',
  })
  async checkMeetingStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.meetingsService.checkTranscriptAvailability(user.sub, meetingId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a meeting' })
  @ApiResponse({ status: 204, description: 'Meeting deleted successfully' })
  async deleteMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) meetingId: string,
  ) {
    await this.meetingsService.deleteMeeting(user.sub, meetingId);
  }
}
