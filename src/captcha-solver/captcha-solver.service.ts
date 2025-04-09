// captcha-solver.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CaptchaSolverService {
  constructor(private readonly httpService: HttpService) {}

  // Method to solve reCAPTCHA using 2Captcha service
  async solve2Captcha(siteKey: string, pageUrl: string): Promise<string> {
    const apiKey = process.env.CAPTCHA_SOLVER_API_KEY; // Get from environment variables

    // Step 1: Send the CAPTCHA to the solving service
    const requestUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;

    const submitResponse = await firstValueFrom(
      this.httpService.get(requestUrl),
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
      const resultResponse = await firstValueFrom(
        this.httpService.get(resultUrl),
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
}
