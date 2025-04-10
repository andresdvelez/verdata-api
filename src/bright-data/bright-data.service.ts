import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as fs from 'fs';
import * as https from 'https';
import { join } from 'path';
import { CaptchaSolverService } from 'src/captcha-solver/captcha-solver.service';
import { VerifyIdentityType } from 'src/reports/dto/create-report.dto';
import { Page } from 'puppeteer';

@Injectable()
export class BrightDataService {
  private readonly logger = new Logger(BrightDataService.name);
  private readonly username: string;
  private readonly password: string;
  private readonly host: string;
  private readonly port: string;
  private readonly caCert: Buffer;
  private readonly browserlessToken: string;

  constructor(
    private configService: ConfigService,
    private readonly captchaSolver: CaptchaSolverService,
  ) {
    this.username = this.configService.get<string>('BRIGHTDATA_USERNAME')!;
    this.password = this.configService.get<string>('BRIGHTDATA_PASSWORD')!;
    this.host = this.configService.get<string>('BRIGHTDATA_HOST')!;
    this.port = this.configService.get<string>('BRIGHTDATA_PORT') || '33335';
    this.browserlessToken =
      this.configService.get<string>('BROWSERLESS_TOKEN')!;

    const caPath =
      this.configService.get<string>('BRIGHTDATA_CA_PATH') ||
      join(__dirname, '..', '..', 'certs', 'brightdata_ca.crt');

    this.caCert = fs.readFileSync(caPath);
  }

  /**
   * Creates both the proxy agent and HTTPS agent including the CA certificate.
   */
  private createAgents() {
    const sessionId = Math.floor(Math.random() * 100000);
    const proxyUsername = `${this.username}-session-${sessionId}`;
    const proxyUrl = `http://${proxyUsername}:${this.password}@${this.host}:${this.port}`;

    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    const httpsAgent = new https.Agent({
      ca: this.caCert,
      rejectUnauthorized: true,
    });

    return { proxyAgent, httpsAgent };
  }

  async getPoliceJudicialRecord(
    documentType: string,
    documentNumber: string,
  ): Promise<VerifyIdentityType> {
    const url =
      'https://antecedentes.policia.gov.co:7005/WebJudicial/index.xhtml';
    let page: Page | null = null;

    try {
      // Configurar el servicio para usar Browserless.io si está disponible
      if (this.browserlessToken) {
        this.logger.log('Usando Browserless.io para el scraping');
        await this.captchaSolver.setupWithBrowserless(this.browserlessToken);
      } else {
        this.logger.log('Usando navegador local para el scraping');
      }

      // Usar el servicio de resolución de captchas
      page = await this.captchaSolver.solveWithBrowser(url, {
        // No bloquear imágenes ya que pueden ser necesarias para el captcha
        blockResources: ['font', 'media', 'stylesheet'],
        waitUntil: 'networkidle2',
      });

      // Aceptar términos y condiciones
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

      // Esperar a que el formulario cargue
      await page.waitForSelector('#cedulaTipo', { visible: true });

      // Mapear tipo de documento
      const docTypeMap = {
        CC: 'cc', // Cédula de Ciudadanía
        CE: 'cx', // Cédula de Extranjería
        PA: 'pa', // Pasaporte
        DP: 'dp', // Documento País Origen
      };

      // Seleccionar tipo de documento
      await page.select('#cedulaTipo', docTypeMap[documentType] || 'cc');

      // Ingresar número de documento
      await page.type('#cedulaInput', documentNumber);

      // Ya no necesitamos gestionar el captcha manualmente, el servicio de captchaBypass
      // se encargó de eso durante la navegación, pero podemos intentar una segunda
      // resolución si es necesario
      await this.captchaSolver.solveCaptchaInPage(page);

      // Hacer clic en el botón de envío
      await page.click('#j_idt17');

      // Esperar a que los resultados carguen
      await page.waitForSelector('#form\\:mensajeCiudadano', {
        timeout: 30000,
      });

      // Extraer el texto del resultado
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
   * Executes a GET request through Bright Data proxy with retries and CA support.
   */
  async getWithProxy(url: string, retries = 3): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { proxyAgent, httpsAgent } = this.createAgents();

        const response = await axios.get(url, {
          httpAgent: proxyAgent,
          httpsAgent,
          proxy: false, // disable default Axios proxy handling
        });

        return response.data;
      } catch (error) {
        const message =
          (error as { message: string })?.message || 'Unknown error';
        this.logger.warn(`Attempt ${attempt} failed: ${message}`);
        if (attempt === retries) throw new Error('All retries failed.');
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }
  }
}
