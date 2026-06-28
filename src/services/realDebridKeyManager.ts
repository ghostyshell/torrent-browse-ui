import { realDebridService } from './realDebridService';

class RealDebridKeyManager {
  private isInitialized = false;
  private hasUserKey = false;

  initialize(hasRealDebridKey: boolean): void {
    this.hasUserKey = hasRealDebridKey;
    realDebridService.setConfigured(hasRealDebridKey);
    this.isInitialized = true;
  }

  clear(): void {
    this.hasUserKey = false;
    this.isInitialized = false;
    realDebridService.setConfigured(false);
  }

  hasUserApiKey(): boolean {
    return this.hasUserKey;
  }

  async updateApiKey(hasRealDebridKey: boolean): Promise<void> {
    this.initialize(hasRealDebridKey);
  }
}

export const realDebridKeyManager = new RealDebridKeyManager();
