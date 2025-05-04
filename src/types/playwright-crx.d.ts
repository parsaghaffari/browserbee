import { Page } from 'playwright-crx/test';

declare module 'playwright-crx' {
  interface CrxApplication {
    addListener(event: 'attached', listener: (data: { page: Page; tabId: number }) => void): CrxApplication;
    addListener(event: 'detached', listener: (tabId: number) => void): CrxApplication;
    addListener(event: 'targetCreated', listener: (target: any) => void): CrxApplication;
    addListener(event: 'targetDestroyed', listener: (target: any) => void): CrxApplication;
    addListener(event: 'targetChanged', listener: (target: any) => void): CrxApplication;
    addListener(event: 'dialog', listener: (dialog: any, page: Page) => void): CrxApplication;
    addListener(event: 'console', listener: (msg: any, page: Page) => void): CrxApplication;
    addListener(event: 'pageerror', listener: (error: any, page: Page) => void): CrxApplication;
  }
}
