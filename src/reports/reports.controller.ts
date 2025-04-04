import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { JwtTokenGuard } from 'src/jwt-token/jwt-token.guard';
import { RequestWithUser } from 'src/types/jwtRequestWithUser';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtTokenGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Report created successfully' })
  create(
    @Body() createReportDto: CreateReportDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.reportsService.create(createReportDto, userId);
  }

  @Get()
  @ApiCreatedResponse({ description: 'List all reports for the user' })
  findAll(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    return this.reportsService.findAll(userId);
  }

  @Get(':id')
  @ApiCreatedResponse({ description: 'Get a specific report' })
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.id;
    return this.reportsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiCreatedResponse({ description: 'Update a report' })
  update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.reportsService.update(id, updateReportDto, userId);
  }

  @Delete(':id')
  @ApiCreatedResponse({ description: 'Delete a report' })
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user.id;
    return this.reportsService.remove(id, userId);
  }
}
