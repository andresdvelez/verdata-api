import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { CaptchaBypassService } from 'src/captcha-bypass/captcha-bypass.service';

@Injectable()
export class CaptchaSolverService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly captchaBypassService: CaptchaBypassService,
  ) {}

  // Método original usando la API 2Captcha directamente
  async solve2Captcha(siteKey: string, pageUrl: string): Promise<string> {
    const apiKey = this.configService.get<string>('CAPTCHA_SOLVER_API_KEY');

    // Step 1: Send the CAPTCHA to the solving service
    const requestUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;

    interface SubmitResponse {
      status: number;
      request: string;
      error_text?: string;
    }

    const submitResponse = await firstValueFrom(
      this.httpService.get<SubmitResponse>(requestUrl),
    );

    if (submitResponse.data.status !== 1) {
      throw new Error(
        `Failed to submit CAPTCHA: ${submitResponse.data.error_text || 'Unknown error'}`,
      );
    }

    const captchaId = submitResponse.data.request;

    // Step 2: Poll for the solution
    let attempts = 0;
    const maxAttempts = 30; // Try for up to 30 * 5 seconds = 2.5 minutes
    let solved = false;
    let solution = '';

    while (!solved && attempts < maxAttempts) {
      attempts++;

      // Wait 5 seconds between polling
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const resultUrl = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`;
      interface ResultResponse {
        status: number;
        request: string;
      }

      const resultResponse = await firstValueFrom(
        this.httpService.get<ResultResponse>(resultUrl),
      );

      if (resultResponse.data.status === 1) {
        solved = true;
        solution = resultResponse.data.request;
      } else if (resultResponse.data.request !== 'CAPCHA_NOT_READY') {
        throw new Error(
          `Failed to solve CAPTCHA: ${resultResponse.data.request || 'Unknown error'}`,
        );
      }
    }

    if (!solved) {
      throw new Error('Timed out waiting for CAPTCHA solution');
    }

    return solution;
  }

  // Nuevo método usando CaptchaBypassService
  async solveWithBrowser(url: string, options: any = {}) {
    // Asegurar que el servicio de bypass esté configurado
    await this.captchaBypassService.setupCaptchaSolver();

    // Navegar y resolver captchas automáticamente
    return this.captchaBypassService.navigateAndSolveCaptcha(url, options);
  }

  // Método para resolver captchas en una página existente
  async solveCaptchaInPage(page: any) {
    return this.captchaBypassService.solveCaptcha(page);
  }

  // Método para obtener una nueva página con protección anti-detección
  async getStealthPage() {
    return this.captchaBypassService.createStealthPage();
  }
}
