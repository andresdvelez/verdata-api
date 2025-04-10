/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Browser, Page } from 'puppeteer';
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const AnonymizeUAPlugin = require('puppeteer-extra-plugin-anonymize-ua');

@Injectable()
export class CaptchaBypassService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CaptchaBypassService.name);
  private browser: Browser | null = null;
  private readonly apiKey: string;
  private isBrowserless = false;
  private browserlessToken = '';

  constructor(private configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('CAPTCHA_SOLVER_API_KEY') || '';

    // Configure plugins
    puppeteer.use(StealthPlugin());
    puppeteer.use(AnonymizeUAPlugin());
  }

  async onModuleInit() {
    // No inicializar el navegador automáticamente aquí para evitar
    // uso de recursos innecesarios si no se utiliza el servicio
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  /**
   * Configura el servicio para usar Browserless.io
   */
  async setupWithBrowserless(token: string) {
    this.browserlessToken = token;
    this.isBrowserless = true;

    // Close any existing browser before switching to Browserless
    await this.closeBrowser();

    this.logger.log('Browserless.io configurado para su uso');
    return true;
  }

  private async initBrowser(options = {}) {
    if (!this.browser || !this.browser.isConnected()) {
      this.logger.log(
        'Iniciando instancia de navegador para resolución de captchas...',
      );

      // If using Browserless.io
      if (this.isBrowserless && this.browserlessToken) {
        const launchArgs = JSON.stringify({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=' +
              (1920 + Math.floor(Math.random() * 100)) +
              ',' +
              (1080 + Math.floor(Math.random() * 100)),
          ],
          stealth: true, // Enable built-in stealth
          timeout: 60000,
        });

        this.logger.log('Conectando con Browserless.io...');
        try {
          this.browser = await puppeteer.connect({
            browserWSEndpoint: `wss://production-sfo.browserless.io/?token=${this.browserlessToken}&launch=${launchArgs}`,
          });
          this.logger.log('Conexión exitosa con Browserless.io');
        } catch (error) {
          this.logger.error(
            `Error al conectar con Browserless.io: ${error.message}`,
          );
          throw error;
        }
      } else {
        // Local Puppeteer launch with proxy configuration:
        const brightdataHost =
          this.configService.get<string>('BRIGHTDATA_HOST');
        const brightdataPort =
          this.configService.get<string>('BRIGHTDATA_PORT') || '33335';
        const defaultOptions = {
          headless:
            this.configService.get<string>('NODE_ENV') === 'production'
              ? true
              : false,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            // Proxy argument to force traffic through Bright Data
            `--proxy-server=http://${brightdataHost}:${brightdataPort}`,
            `--window-size=${1920 + Math.floor(Math.random() * 100)},${1080 + Math.floor(Math.random() * 100)}`,
          ],
        };

        // Launch local browser with merged options
        this.browser = await puppeteer.launch({
          ...defaultOptions,
          ...options,
        });
      }
    }
    return this.browser;
  }

  private async closeBrowser() {
    if (this.browser) {
      this.logger.log('Cerrando instancia de navegador...');
      try {
        await this.browser.close();
      } catch (error) {
        this.logger.warn(`Error al cerrar el navegador: ${error.message}`);
      }
      this.browser = null;
    }
  }

  /**
   * Crea una instancia de página con configuraciones anti-detección
   */
  async createStealthPage(): Promise<Page> {
    const browser = await this.initBrowser();
    const page = await (browser as Browser).newPage();

    // Configure a random viewport
    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 1080 + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: false,
      isMobile: false,
    });

    // Inject scripts to modify browser behavior and evade detection
    await page.evaluateOnNewDocument(() => {
      // Store the original getParameter method
      const originalGetParameter =
        WebGLRenderingContext.prototype.getParameter.bind(
          WebGLRenderingContext.prototype,
        );

      // Override the getParameter method
      WebGLRenderingContext.prototype.getParameter = function (
        parameter: number,
      ) {
        if (parameter === 37445) {
          return 'Intel Inc.'; // Mock vendor
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine'; // Mock renderer
        }
        // Call the original method for other parameters
        return originalGetParameter.call(this, parameter);
      };

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['es-ES', 'es', 'en-US', 'en'],
      });

      // Hide WebDriver property
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Set default navigation timeout
    page.setDefaultNavigationTimeout(120000);

    return page;
  }

  /**
   * Configura el servicio para resolver captchas
   */
  async setupCaptchaSolver(apiKey?: string, provider = '2captcha') {
    const captchaApiKey = apiKey || this.apiKey;

    if (!captchaApiKey) {
      throw new Error(
        'Se requiere una API key para el servicio de resolución de captchas',
      );
    }

    // Configurar el plugin de Recaptcha con el servicio seleccionado
    puppeteer.use(
      RecaptchaPlugin({
        provider: {
          id: provider,
          token: captchaApiKey,
        },
        visualFeedback: true,
      }),
    );

    // Asegurar que el navegador está inicializado
    await this.initBrowser();
  }

  /**
   * Resuelve captchas en una página
   */
  async solveCaptcha(page: Page) {
    try {
      this.logger.log('Detectando y resolviendo captcha...');

      // Intentar resolver cualquier captcha en la página
      const { solved, error } = await page.solveRecaptchas();

      if (error) {
        throw new Error(`Error al resolver captcha: ${error}`);
      }

      if (solved && solved.length > 0) {
        this.logger.log(
          `Captcha resuelto correctamente. Total: ${solved.length}`,
        );
        return true;
      }

      this.logger.log('No se detectaron captchas para resolver');
      return false;
    } catch (error) {
      this.logger.error(`Error al resolver captcha: ${error.message}`);
      return false;
    }
  }

  /**
   * Navega a una URL y resuelve automáticamente cualquier captcha
   */
  async navigateAndSolveCaptcha(url: string, options: any = {}) {
    const page = await this.createStealthPage();

    // Interceptar peticiones (opcional, para mejorar rendimiento)
    if (options.blockResources) {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (
          options.blockResources.some(
            (resource) => req.resourceType() === resource,
          )
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });
    }

    // Navegar a la URL
    this.logger.log(`Navegando a: ${url}`);
    await page.goto(url, {
      waitUntil: options.waitUntil || 'networkidle2',
      timeout: options.timeout || 60000,
    });

    // Esperar un tiempo aleatorio para simular comportamiento humano
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000),
    );

    // Intentar resolver captchas
    await this.solveCaptcha(page);

    return page;
  }

  // Método alternativo: aplicar solución manualmente usando el API result
  async applyCaptchaSolution(page: Page) {
    // Primero intentar con el solveCaptcha integrado
    const autoSolved = await this.solveCaptcha(page);

    if (autoSolved) {
      return true;
    }

    // Si no se pudo resolver automáticamente, usar el método API tradicional
    this.logger.log('Usando API 2Captcha para resolver captcha manualmente...');

    try {
      // Obtener solución usando el CaptchaSolverService original
      // Nota: Esto habría que adaptarlo para usar la API de 2Captcha directamente aquí o
      // inyectar el CaptchaSolverService original

      // Ejemplo: (habría que implementarlo)
      //   const solution = await this.fetchCaptchaSolution(siteKey, pageUrl);

      // Aplicar la solución en la página
      await page.evaluate(() => {
        const recaptchaElement = document.getElementById(
          'g-recaptcha-response',
        );
        if (recaptchaElement) {
          recaptchaElement.innerHTML = '${solution}';
        }
      });

      // Trigger callback para validar
      await page.evaluate('___grecaptcha_cfg.clients[0].aa.l.callback()');

      return true;
    } catch (error) {
      this.logger.error(`Error al aplicar solución manual: ${error.message}`);
      return false;
    }
  }

  // Implementar este método si se necesita usar el API directamente
  //   private async fetchCaptchaSolution(
  //     siteKey: string,
  //     pageUrl: string,
  //   ): Promise<string> {
  //     // Implementar la misma lógica que en el servicio original CaptchaSolverService
  //     // para obtener la solución del captcha usando la API de 2Captcha

  //     // Por ahora devolvemos un error para que se implemente según necesidad
  //     throw new Error('Método fetchCaptchaSolution no implementado');
  //   }
}
