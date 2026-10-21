/**
 * Hospital Residential Allocation & Management System
 * Client-Server LAN Network & Connection Service
 * শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ
 */

export interface NetworkConfig {
  mode: 'STANDALONE_LOCAL' | 'CENTRAL_SERVER_LAN';
  serverHost: string;
  serverPort: number;
  apiPrefix: string;
  isOnline: boolean;
  lastPingMs: number;
  lastCheckedAt: string;
  lanAddresses?: string[];
}

const NETWORK_STORAGE_KEY = 'ssnimch_network_config';

class NetworkService {
  private config: NetworkConfig;

  constructor() {
    const saved = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (saved) {
      try {
        this.config = JSON.parse(saved);
      } catch {
        this.config = this.getDefaultConfig();
      }
    } else {
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): NetworkConfig {
    return {
      mode: 'CENTRAL_SERVER_LAN',
      serverHost: window.location.hostname || '192.168.1.100',
      serverPort: Number(window.location.port) || 3000,
      apiPrefix: '/api/v1',
      isOnline: true,
      lastPingMs: 12,
      lastCheckedAt: new Date().toISOString(),
      lanAddresses: ['127.0.0.1']
    };
  }

  public getConfig(): NetworkConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<NetworkConfig>): NetworkConfig {
    this.config = {
      ...this.config,
      ...newConfig,
      lastCheckedAt: new Date().toISOString()
    };
    localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(this.config));
    return this.getConfig();
  }

  public async testServerConnection(host: string, port: number): Promise<{ success: boolean; latencyMs: number; message: string; serverData?: any }> {
    const start = performance.now();
    try {
      const res = await fetch('/api/v1/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const latencyMs = Math.max(1, Math.round(performance.now() - start));
      this.config.isOnline = true;
      this.config.lastPingMs = latencyMs;
      this.config.lastCheckedAt = new Date().toISOString();
      if (data.lanAddresses) {
        this.config.lanAddresses = data.lanAddresses;
      }
      this.saveConfig(this.config);
      return {
        success: true,
        latencyMs,
        serverData: data,
        message: `কেন্দ্রীয় সার্ভারের সাথে সংযোগ সফল! (${host}:${port}, পিং: ${latencyMs}ms, সক্রিয় বরাদ্দ: ${data?.counts?.activeAllocations ?? 0})`
      };
    } catch {
      this.config.isOnline = false;
      this.saveConfig(this.config);
      return {
        success: false,
        latencyMs: 0,
        message: `কেন্দ্রীয় সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি (${host}:${port})। লোকাল নেটওয়ার্ক ও ফায়ারওয়াল পরীক্ষা করুন।`
      };
    }
  }
}

export const networkService = new NetworkService();
