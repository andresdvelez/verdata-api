/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import { join } from 'path';
import { CaptchaSolverService } from 'src/captcha-solver/captcha-solver.service';
import { VerifyIdentityType } from 'src/reports/dto/create-report.dto';
import { Page } from 'puppeteer';
import * as https from 'https';

@Injectable()
export class BrightDataService {
  private readonly logger = new Logger(BrightDataService.name);
  private readonly username: string;
  private readonly password: string;
  private readonly host: string;
  private readonly port: number;
  private readonly caCert: Buffer;
  private readonly browserlessToken: string;

  constructor(
    private configService: ConfigService,
    private readonly captchaSolver: CaptchaSolverService,
  ) {
    this.username = this.configService.get<string>('BRIGHTDATA_USERNAME')!;
    this.password = this.configService.get<string>('BRIGHTDATA_PASSWORD')!;
    this.host = this.configService.get<string>('BRIGHTDATA_HOST')!;
    this.port =
      Number(this.configService.get<string>('BRIGHTDATA_PORT')) || 33335;
    this.browserlessToken =
      this.configService.get<string>('BROWSERLESS_TOKEN')!;

    const caPath =
      this.configService.get<string>('BRIGHTDATA_CA_PATH') ||
      join(__dirname, '..', '..', 'certs', 'brightdata_ca.crt');

    this.caCert = fs.readFileSync(caPath);
  }

  async getPoliceJudicialRecord(
    documentType: string,
    documentNumber: string,
  ): Promise<VerifyIdentityType> {
    const url =
      'https://antecedentes.policia.gov.co:7005/WebJudicial/index.xhtml';
    let page: Page | null = null;

    try {
      // Use Browserless.io if available for scraping.
      if (this.browserlessToken) {
        this.logger.log('Usando Browserless.io para el scraping');
        await this.captchaSolver.setupWithBrowserless(this.browserlessToken);
      } else {
        this.logger.log('Usando navegador local para el scraping');
      }

      // Use the captcha solver service for page resolution.
      page = await this.captchaSolver.solveWithBrowser(url, {
        blockResources: ['font', 'media', 'stylesheet'],
        waitUntil: 'networkidle2',
      });

      // Accept the terms and conditions.
      await page.waitForSelector('#aceptaOption\\:0', { visible: true });
      await page.evaluate(() => {
        const aceptaOption = document.querySelector('#aceptaOption\\:0');
        if (aceptaOption) {
          (aceptaOption as HTMLButtonElement).click();
        }
      });

      await page.waitForFunction(() => {
        const btn = document.querySelector('#continuarBtn');
        return btn && !(btn as HTMLButtonElement).disabled;
      });

      await page.evaluate(() => {
        const continuarBtn = document.querySelector('#continuarBtn');
        if (continuarBtn) {
          (continuarBtn as HTMLButtonElement).click();
        }
      });

      // Wait for the form to load.
      await page.waitForSelector('#cedulaTipo', { visible: true });

      // Map document type.
      const docTypeMap: { [key: string]: string } = {
        CC: 'cc', // Cédula de Ciudadanía
        CE: 'cx', // Cédula de Extranjería
        PA: 'pa', // Pasaporte
        DP: 'dp', // Documento País Origen
      };

      // Select document type.
      await page.select('#cedulaTipo', docTypeMap[documentType] || 'cc');

      // Enter document number.
      await page.type('#cedulaInput', documentNumber);

      // Resolve captcha on the page.
      await this.captchaSolver.solveCaptchaInPage(page);

      // Click on the submit button.
      await page.click('#j_idt17');

      // Wait for the results.
      await page.waitForSelector('#form\\:mensajeCiudadano', {
        timeout: 30000,
      });

      // Extract result text.
      const resultText = await page.evaluate(() => {
        const element = document.querySelector('#form\\:mensajeCiudadano');
        return element ? (element as HTMLFormElement).innerText : '';
      });

      const extractInformation = (texto: string): VerifyIdentityType => {
        const regex =
          /Cédula de Ciudadanía Nº (\d+)\nApellidos y Nombres: (.+?)\n/;
        const coincidences = texto.match(regex);

        if (!coincidences) {
          throw new Error('No matches found in the result text.');
        }
        const idNumber = coincidences[1];
        const fullName = coincidences[2];

        return {
          id: idNumber,
          name: fullName,
          nationality: 'Colombiana',
          document_type: 'Cédula de Ciudadanía',
        };
      };

      const resultado = extractInformation(resultText);
      return resultado;
    } catch (error) {
      this.logger.error('Error scraping police records:', error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Executes a GET request through the Bright Data proxy with retries.
   */
  async getWithProxy(url: string, retries = 3): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Create a fresh instance of Axios with proxy configuration
        const instance = axios.create({
          proxy: {
            host: this.host,
            port: this.port,
            auth: {
              username: `${this.username}-session-${Math.floor(Math.random() * 100000)}`,
              password: this.password,
            },
            protocol: 'http',
          },
          httpsAgent: new https.Agent({
            ca: this.caCert,
            rejectUnauthorized: false,
          }),
        });

        const response = await instance.get(url);
        return response.data;
      } catch (error) {
        const message =
          (error as { message: string })?.message || 'Unknown error';
        this.logger.warn(`Attempt ${attempt} failed: ${message}`);
        if (attempt === retries) throw new Error('All retries failed.');
        // Exponential backoff before retry
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }
  }
}
