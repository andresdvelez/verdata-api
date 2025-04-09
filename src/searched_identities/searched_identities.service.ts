import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSearchedIdentityDto } from './dto/create-searched_identity.dto';
import { UpdateSearchedIdentityDto } from './dto/update-searched_identity.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { BrightDataService } from 'src/bright-data/bright-data.service';

@Injectable()
export class SearchedIdentitiesService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private readonly brightData: BrightDataService,
  ) {}

  async create(createSearchedIdentityDto: CreateSearchedIdentityDto) {
    // Step 1: Get identity verification from external API
    const identityResponse = await this.verifyIdentity(
      createSearchedIdentityDto.nationality,
      createSearchedIdentityDto.document,
    );

    return identityResponse;

    // // Step 2: Check if identity already exists in the database
    // const searchedIdentity = await this.findOneByDocument(identityResponse.ID);

    // // Step 3: If identity doesn't exist, create a new one
    // if (!searchedIdentity) {
    //   // Format the identity data for creating a new SearchedIdentity
    //   const createIdentityDto: Partial<SearchedIdentities> = {
    //     name: identityResponse.Nombres,
    //     nationality: identityResponse.Nacionalidad,
    //     document: identityResponse.ID,
    //     document_type: identityResponse['Tipo de documento'],
    //   };

    //   const createdIdentity = await this.prisma.searchedIdentities.create({
    //     data: {
    //       name: createIdentityDto.name!,
    //       nationality: createIdentityDto.nationality!,
    //       document: createIdentityDto.document,
    //       document_type: createIdentityDto.document_type,
    //     },
    //   });

    // Refetch the searched identity to include the Report property
    // return await this.findOne(createdIdentity.id);
    // }

    // return searchedIdentity;
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

  private async verifyIdentity(countryCode: string, documentNumber: string) {
    try {
      // If the country is Colombia, check police records
      if (countryCode === 'CO') {
        // Get both police record and LatamVerify data
        const policeRecord =
          await this.checkColombianPoliceRecord(documentNumber);

        // Parse the police record information for structured data
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsedRecord = this.parsePoliceRecord(policeRecord);

        // Return combined data
        return {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          policeRecord: parsedRecord,
        };
      }
    } catch (error) {
      throw new HttpException(
        `Failed to verify identity: ${(error as { message: string }).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Helper method to verify identity with external API
  // private async verifyIdentity(
  //   countryCode: string,
  //   documentNumber: string,
  // ): Promise<VerifyIdentityType> {
  //   const url = `https://api.latamverify.com/identity_validation/${countryCode}/query_by_document/${documentNumber}`;

  //   try {
  //     const response = (await this.brightData.getWithProxy(
  //       url,
  //     )) as VerifyIdentityType;
  //     // Process the response as needed
  //     return response;
  //   } catch (error) {
  //     throw new HttpException(
  //       `Failed to verify identity: ${(error as { message: string }).message}`,
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }
  // }

  // Method to check Colombian police records - uses direct Puppeteer approach, not BrightData proxy
  private async checkColombianPoliceRecord(
    documentNumber: string,
  ): Promise<string> {
    try {
      // Assume document type is Cédula de Ciudadanía
      const documentType = 'CC';

      // Use the BrightData service to get police records directly
      const recordText = await this.brightData.getPoliceJudicialRecord(
        documentType,
        documentNumber,
      );

      return recordText;
    } catch (error) {
      throw new HttpException(
        `Failed to check Colombian police record: ${(error as { message: string }).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Method to parse police record text into structured data
  private parsePoliceRecord(recordText: string): any {
    // Extract relevant information from the record text
    const hasRecords = !recordText.includes(
      'NO TIENE ASUNTOS PENDIENTES CON LAS AUTORIDADES JUDICIALES',
    );

    // Extract document number
    const documentNumberMatch = recordText.match(
      /Cédula de Ciudadanía Nº (\d+)/,
    );
    const documentNumber = documentNumberMatch ? documentNumberMatch[1] : '';

    // Extract timestamp
    const timestampMatch = recordText.match(
      /Que siendo las ([\d:]+\s+[AP]M) horas del (\d{2}\/\d{2}\/\d{4})/,
    );
    const time = timestampMatch ? timestampMatch[1] : '';
    const date = timestampMatch ? timestampMatch[2] : '';

    return {
      hasJudicialRecords: hasRecords,
      documentNumber,
      consultDate: date,
      consultTime: time,
      fullRecordText: recordText.trim(),
    };
  }
}
