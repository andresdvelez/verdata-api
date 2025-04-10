// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Page } from 'puppeteer';

declare module 'puppeteer' {
  interface Page {
    solveRecaptchas: () => Promise<{ solved: string; error: number }>;
  }
}
