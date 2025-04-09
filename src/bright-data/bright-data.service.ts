// src/bright-data/bright-data.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as fs from 'fs';
import * as https from 'https';
import { join } from 'path';
import puppeteer from 'puppeteer';
import { CaptchaSolverService } from 'src/captcha-solver/captcha-solver.service';

@Injectable()
export class BrightDataService {
  private readonly logger = new Logger(BrightDataService.name);
  private readonly username: string;
  private readonly password: string;
  private readonly host: string;
  private readonly port: string;
  private readonly caCert: Buffer;

  constructor(
    private configService: ConfigService,
    private readonly captchaSolver?: CaptchaSolverService,
  ) {
    this.username = this.configService.get<string>('BRIGHTDATA_USERNAME')!;
    this.password = this.configService.get<string>('BRIGHTDATA_PASSWORD')!;
    this.host = this.configService.get<string>('BRIGHTDATA_HOST')!;
    this.port = this.configService.get<string>('BRIGHTDATA_PORT') || '33335';

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
  ): Promise<string> {
    // Launch browser without proxy
    const browser = await puppeteer.launch({
      headless: false, // Set to true in production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();

      // Navigate to the police antecedents website
      await page.goto(
        'https://antecedentes.policia.gov.co:7005/WebJudicial/index.xhtml',
        {
          waitUntil: 'networkidle2',
          timeout: 60000,
        },
      );

      await page.waitForSelector('#aceptaOption\\:0', { visible: true });
      await page.evaluate(() => {
        document.querySelector('#aceptaOption\\:0');
      });

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

      // Wait for the form to load
      await page.waitForSelector('#cedulaTipo', { visible: true });

      // Map document type to form value
      const docTypeMap = {
        CC: 'cc', // Cédula de Ciudadanía
        CE: 'cx', // Cédula de Extranjería
        PA: 'pa', // Pasaporte
        DP: 'dp', // Documento País Origen
      };

      // Select document type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await page.select('#cedulaTipo', docTypeMap[documentType] || 'cc');

      // Enter document number
      await page.type('#cedulaInput', documentNumber);
      // Handle reCAPTCHA
      if (this.captchaSolver) {
        // Get the site key from the page
        // const siteKey = await page.evaluate(() => {
        //   const recaptchaDiv = document.querySelector('.g-recaptcha');
        //   return recaptchaDiv
        //     ? recaptchaDiv.getAttribute('data-sitekey')
        //     : null;
        // });

        // Solve the CAPTCHA
        const captchaSolution = await this.captchaSolver.solve2Captcha(
          '6LfIQxErAAAAAPI5I3QgYD7A5NYyao_WF4Ozmk2r',
          'https://antecedentes.policia.gov.co:7005/WebJudicial/antecedentes.xhtml',
        );

        console.log(captchaSolution);

        // Apply the solution
        await page.evaluate(
          `document.getElementById("g-recaptcha-response").innerHTML="${captchaSolution}"`,
        );

        // Trigger reCAPTCHA callback
        await page.evaluate('___grecaptcha_cfg.clients[0].aa.l.callback()');

        // Wait for a moment to ensure the CAPTCHA is properly verified
        await page.waitForSelector('g-recaptcha-response', { timeout: 100000 });
      }

      // Click the submit button
      await page.click('#j_idt17');

      // Wait for results to load
      await page.waitForSelector('#form\\:mensajeCiudadano', {
        timeout: 30000,
      });

      // Extract the result text
      const resultText = (await page.evaluate(() => {
        const element = document.querySelector('#form\\:mensajeCiudadano');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return element ? (element as any).innerText : '';
      })) as string;

      return resultText;
    } catch (error) {
      console.error('Error scraping police records:', error);
      throw error;
    } finally {
      await browser.close();
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
        await new Promise((res) => setTimeout(res, 1000 * attempt)); // Exponential backoff
      }
    }
  }
}
