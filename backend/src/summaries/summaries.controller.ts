import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SummariesService } from './summaries.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { UpdateActionItemDto } from './dto/update-action-item.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '@/common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';

@ApiTags('summaries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('summaries')
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @Get(':meetingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get summary for a meeting' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.summariesService.getSummaryByUserId(user.sub, meetingId);
  }

  @Post(':meetingId/generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate AI summary for a meeting' })
  @ApiResponse({
    status: 201,
    description: 'Summary generated successfully',
  })
  async generateSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.summariesService.generateSummary(user.sub, meetingId);
  }

  @Post(':meetingId/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate summary for a meeting' })
  @ApiResponse({
    status: 200,
    description: 'Summary regenerated successfully',
  })
  async regenerateSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    return this.summariesService.regenerateSummary(user.sub, meetingId);
  }

  @Get('search/results')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search summaries' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchQueryDto,
  ) {
    return this.summariesService.searchSummaries(user.sub, query);
  }

  @Patch(':meetingId/action-items/:index')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update action item status' })
  @ApiResponse({
    status: 200,
    description: 'Action item updated successfully',
  })
  async updateActionItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
    @Param('index') index: string,
    @Query() updateDto: UpdateActionItemDto,
  ) {
    const indexNum = parseInt(index, 10);
    return this.summariesService.updateActionItemStatus(
      user.sub,
      meetingId,
      indexNum,
      updateDto,
    );
  }

  @Get(':meetingId/export/pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export summary as PDF' })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    schema: { type: 'string', format: 'binary' },
  })
  async exportSummaryPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
    @Res() res: Response,
  ) {
    const pdfStream = await this.summariesService.exportSummaryPdf(
      user.sub,
      meetingId,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="summary-${meetingId}.pdf"`,
    );

    pdfStream.pipe(res);
  }
}
