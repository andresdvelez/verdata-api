import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSearchedIdentityDto } from './dto/create-searched_identity.dto';
import { UpdateSearchedIdentityDto } from './dto/update-searched_identity.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { VerifyIdentityType } from 'src/reports/dto/create-report.dto';
import { HttpService } from '@nestjs/axios';
import { SearchedIdentities } from '@prisma/client';

@Injectable()
export class SearchedIdentitiesService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async create(createSearchedIdentityDto: CreateSearchedIdentityDto) {
    // Step 1: Get identity verification from external API
    const identityResponse = await this.verifyIdentity(
      createSearchedIdentityDto.nationality,
      createSearchedIdentityDto.document,
    );

    // Step 2: Check if identity already exists in the database
    const searchedIdentity = await this.findOneByDocument(identityResponse.ID);

    // Step 3: If identity doesn't exist, create a new one
    if (!searchedIdentity) {
      // Format the identity data for creating a new SearchedIdentity
      const createIdentityDto: Partial<SearchedIdentities> = {
        name: identityResponse.Nombres,
        nationality: identityResponse.Nacionalidad,
        document: identityResponse.ID,
        document_type: identityResponse['Tipo de documento'],
      };

      const createdIdentity = await this.prisma.searchedIdentities.create({
        data: {
          name: createIdentityDto.name!,
          nationality: createIdentityDto.nationality!,
          document: createIdentityDto.document,
          document_type: createIdentityDto.document_type,
        },
      });

      // Refetch the searched identity to include the Report property
      return await this.findOne(createdIdentity.id);
    }

    return searchedIdentity;
  }

  async findAll() {
    return this.prisma.searchedIdentities.findMany();
  }

  async findOneByDocument(document: string) {
    const searchedIdentity = await this.prisma.searchedIdentities.findUnique({
      where: {
        document: document,
      },
      include: {
        Report: true,
      },
    });

    return searchedIdentity;
  }

  async findOne(id: string) {
    // Find the searched identity by ID
    const searchedIdentity = await this.prisma.searchedIdentities.findUnique({
      where: { id },
      include: {
        Report: true,
      },
    });

    // Throw an error if the searched identity is not found
    if (!searchedIdentity) {
      throw new NotFoundException(`Searched identity with ID ${id} not found`);
    }

    return searchedIdentity;
  }

  async update(
    id: string,
    updateSearchedIdentityDto: UpdateSearchedIdentityDto,
  ) {
    // Check if the searched identity exists
    const existingIdentity = await this.prisma.searchedIdentities.findUnique({
      where: { id },
    });

    if (!existingIdentity) {
      throw new NotFoundException(`Searched identity with ID ${id} not found`);
    }

    // Update the searched identity
    return this.prisma.searchedIdentities.update({
      where: { id },
      data: {
        name: updateSearchedIdentityDto.name,
        nationality: updateSearchedIdentityDto.nationality,
        document: updateSearchedIdentityDto.document,
        document_type: updateSearchedIdentityDto.document_type,
      },
    });
  }

  async remove(id: string) {
    // Check if the searched identity exists
    const existingIdentity = await this.prisma.searchedIdentities.findUnique({
      where: { id },
    });

    if (!existingIdentity) {
      throw new NotFoundException(`Searched identity with ID ${id} not found`);
    }

    // Delete the searched identity
    await this.prisma.searchedIdentities.delete({
      where: { id },
    });

    return { id, deleted: true };
  }

  // Helper method to verify identity with external API
  private async verifyIdentity(countryCode: string, documentNumber: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://api.latamverify.com/identity_validation/${countryCode}/query_by_document/${documentNumber}`,
        ),
      );
      return (response as { data: VerifyIdentityType }).data;
    } catch (error) {
      throw new HttpException(
        `Failed to verify identity: ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
