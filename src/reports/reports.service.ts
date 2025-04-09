import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SearchedIdentitiesService } from '../searched_identities/searched_identities.service';
import { createSanctionsListsStructureExample } from './utils/createSanctionsListsStructureExample';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private searchedIdentitiesService: SearchedIdentitiesService,
  ) {}

  async create(createReportDto: CreateReportDto, userId: string) {
    try {
      const createdIdentity = await this.searchedIdentitiesService.create({
        document: createReportDto.documentNumber,
        nationality: createReportDto.countryCode,
      });

      // Step 1: Get identity verification
      // const sanctionsLists = createSanctionsListsStructureExample();

      // // Step 2: Build and create the report
      // if (!createdIdentity.Report) {
      //   const report = await this.prisma.report.create({
      //     data: {
      //       user_id: userId,
      //       related_identity_id: createdIdentity.id,
      //       is_identity_matched: true,
      //       risk_score: this.calculateRiskScore(),
      //       sanctions_lists: sanctionsLists,
      //       peps_verification: false,
      //       criminal_records: Math.random() > 0.5, // Randomized for demo
      //       news_media: Math.random() > 0.5, // Randomized for demo
      //       nationality: createdIdentity.nationality,
      //       search_data: createReportDto.documentNumber,
      //       search_type: createReportDto.searchType,
      //       created_at: new Date(),
      //     },
      //   });

      //   // Step 3: Return the complete report with related identity
      //   const completeReport = await this.prisma.report.findUnique({
      //     where: { id: report.id },
      //     include: {
      //       SearchedIdentities: true,
      //     },
      //   });

      //   return completeReport;
      // }

      // return createdIdentity.Report;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        `Failed to create report: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(userId: string) {
    return this.prisma.report.findMany({
      where: {
        user_id: userId,
      },
      include: {
        SearchedIdentities: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const report = await this.prisma.report.findFirst({
      where: {
        id,
        user_id: userId,
      },
      include: {
        SearchedIdentities: true,
      },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async update(id: string, updateReportDto: UpdateReportDto, userId: string) {
    // First check if the report exists and belongs to the user
    const existingReport = await this.prisma.report.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!existingReport) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    // Update the report
    return this.prisma.report.update({
      where: { id },
      data: {
        criminal_records: updateReportDto.criminal_records,
        is_identity_matched: updateReportDto.is_identity_matched,
        news_media: updateReportDto.news_media,
        peps_verification: updateReportDto.peps_verification,
        risk_score: updateReportDto.risk_score,
        sanctions_lists: updateReportDto.sanctions_lists,
        search_data: updateReportDto.search_data,
        search_type: updateReportDto.search_type,
      },
      include: {
        SearchedIdentities: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    // First check if the report exists and belongs to the user
    const existingReport = await this.prisma.report.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!existingReport) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    // Delete the report
    await this.prisma.report.delete({
      where: { id },
    });

    return { id, deleted: true };
  }

  // Helper method to calculate risk score
  private calculateRiskScore(): number {
    // For demonstration, returning a random score between 0-100
    // In a real implementation, this would be based on actual risk factors
    return Math.floor(Math.random() * 100);
  }
}
