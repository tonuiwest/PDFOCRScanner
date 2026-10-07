import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  AppOpenAd,
  InterstitialAd,
  RewardedAd,
  RewardedInterstitialAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

export const AD_IDS = {
  appId: 'ca-app-pub-7561161015961675~9675736118',
  banner: 'ca-app-pub-7561161015961675/4911778451',
  interstitial: 'ca-app-pub-7561161015961675/1411517140',
  native: 'ca-app-pub-7561161015961675/1641303545',
  rewarded: 'ca-app-pub-7561161015961675/9678683076',
  appOpen: 'ca-app-pub-7561161015961675/6266907241',
  rewardedInterstitial: 'ca-app-pub-7561161015961675/1021310261',
};

// Test IDs in development so real units never get invalid traffic.
const pick = (test: string, real: string) => (__DEV__ ? test : real);
export const getBannerId = () => pick(TestIds.ADAPTIVE_BANNER, AD_IDS.banner);
export const getNativeId = () => pick(TestIds.NATIVE, AD_IDS.native);
const INTERSTITIAL_ID = pick(TestIds.INTERSTITIAL, AD_IDS.interstitial);
const REWARDED_ID = pick(TestIds.REWARDED, AD_IDS.rewarded);
const APP_OPEN_ID = pick(TestIds.APP_OPEN, AD_IDS.appOpen);
const REWARDED_INTERSTITIAL_ID = pick(TestIds.REWARDED_INTERSTITIAL, AD_IDS.rewardedInterstitial);

const AD_FREE_KEY = 'ad_free_until';
export const AD_FREE_MINUTES = 5;
export const AD_FREE_ADS_REQUIRED = 3;
const AD_FREE_PROGRESS_KEY = 'ad_free_progress';

const INTERSTITIAL_COOLDOWN_MS = 60_000;
const INTERSTITIAL_EVERY_N = 1;
const APP_OPEN_MIN_BACKGROUND_MS = 30_000;
const APP_OPEN_COOLDOWN_MS = 4 * 60_000;
const APP_OPEN_TTL_MS = 4 * 60 * 60_000; // Google: app open ads expire after 4h.
const RETRY_MS = 15_000;

type Listener = () => void;

class AdsManager {
  private ready = false;
  private starting: Promise<void> | null = null;
  private adFreeUntil = 0;
  private listeners = new Set<Listener>();

  private interstitial?: InterstitialAd;
  private interstitialLoaded = false;
  private interstitialCount = 0;
  private lastFullscreenAt = 0;

  private appOpen?: AppOpenAd;
  private appOpenLoadedAt = 0;
  private backgroundedAt = 0;
  private suppressUntil = 0;
  private showingFullscreen = false;

  privacyOptionsRequired = false;

  /** Gather UMP consent, then initialize the SDK and preload full-screen ads. Safe to call repeatedly. */
  start() {
    if (!this.starting) this.starting = this.doStart();
    return this.starting;
  }

  private async doStart() {
    try {
      const stored = Number(await AsyncStorage.getItem(AD_FREE_KEY));
      if (stored > Date.now()) this.adFreeUntil = stored;
      const progress = Number(await AsyncStorage.getItem(AD_FREE_PROGRESS_KEY));
      if (progress > 0 && progress < AD_FREE_ADS_REQUIRED) this.adFreeProgress = progress;
    } catch {}

    let canRequestAds = true;
    try {
      const info = await AdsConsent.gatherConsent();
      canRequestAds = info.canRequestAds;
      this.privacyOptionsRequired =
        info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
    } catch {
      // Consent form failure must not block the app; fall back to previously obtained consent.
      try { canRequestAds = (await AdsConsent.getConsentInfo()).canRequestAds; } catch {}
    }
    if (!canRequestAds) { this.emit(); return; }

    try {
      await mobileAds().initialize();
    } catch {
      return;
    }
    this.ready = true;
    this.setupInterstitial();
    this.setupAppOpen();
    AppState.addEventListener('change', this.onAppState);
    this.emit();
  }

  // ---- state shared with UI ----
  subscribe(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }
  private emit() { this.listeners.forEach((l) => l()); }
  canShowAds() { return this.ready && !this.isAdFree(); }
  isAdFree() { return this.adFreeUntil > Date.now(); }
  adFreeRemainingMin() { return Math.max(0, Math.ceil((this.adFreeUntil - Date.now()) / 60_000)); }

  async showPrivacyOptions() {
    try {
      const info = await AdsConsent.showPrivacyOptionsForm();
      this.privacyOptionsRequired =
        info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
    } catch {}
  }

  /** Call right before leaving the app for a system UI (scanner, picker, share sheet, viewer) so returning doesn't trigger an app-open ad. */
  suppressAppOpen(ms = 10 * 60_000) { this.suppressUntil = Date.now() + ms; }
  releaseAppOpen() { this.suppressUntil = Date.now() + 2_000; }

  // ---- interstitial: shown after major actions (save, share, open, copy text), capped by a cooldown ----
  private setupInterstitial() {
    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);
    ad.addAdEventListener(AdEventType.LOADED, () => { this.interstitialLoaded = true; });
    ad.addAdEventListener(AdEventType.ERROR, () => {
      this.interstitialLoaded = false;
      setTimeout(() => ad.load(), RETRY_MS);
    });
    ad.addAdEventListener(AdEventType.OPENED, () => { this.showingFullscreen = true; });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      this.showingFullscreen = false;
      this.interstitialLoaded = false;
      this.lastFullscreenAt = Date.now();
      ad.load();
    });
    ad.load();
    this.interstitial = ad;
  }

  maybeShowInterstitial() {
    if (!this.canShowAds() || !this.interstitial || this.showingFullscreen) return;
    this.interstitialCount++;
    if (this.interstitialCount % INTERSTITIAL_EVERY_N !== 0) return;
    if (Date.now() - this.lastFullscreenAt < INTERSTITIAL_COOLDOWN_MS) return;
    if (!this.interstitialLoaded) return;
    this.interstitial.show().catch(() => {});
  }

  // ---- app open: on return to the app after a real background period ----
  private setupAppOpen() {
    const ad = AppOpenAd.createForAdRequest(APP_OPEN_ID);
    ad.addAdEventListener(AdEventType.LOADED, () => { this.appOpenLoadedAt = Date.now(); });
    ad.addAdEventListener(AdEventType.ERROR, () => {
      this.appOpenLoadedAt = 0;
      setTimeout(() => ad.load(), RETRY_MS);
    });
    ad.addAdEventListener(AdEventType.OPENED, () => { this.showingFullscreen = true; });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      this.showingFullscreen = false;
      this.appOpenLoadedAt = 0;
      this.lastFullscreenAt = Date.now();
      ad.load();
    });
    ad.load();
    this.appOpen = ad;
  }

  private onAppState = (state: AppStateStatus) => {
    if (state === 'background') {
      if (!this.showingFullscreen) this.backgroundedAt = Date.now();
      return;
    }
    if (state !== 'active' || !this.backgroundedAt) return;
    const away = Date.now() - this.backgroundedAt;
    this.backgroundedAt = 0;
    const ad = this.appOpen;
    if (!ad || !this.canShowAds() || this.showingFullscreen) return;
    if (Date.now() < this.suppressUntil) return;
    if (away < APP_OPEN_MIN_BACKGROUND_MS) return;
    if (Date.now() - this.lastFullscreenAt < APP_OPEN_COOLDOWN_MS) return;
    if (!this.appOpenLoadedAt) return;
    if (Date.now() - this.appOpenLoadedAt > APP_OPEN_TTL_MS) { this.appOpenLoadedAt = 0; ad.load(); return; }
    ad.show().catch(() => {});
  };

  // ---- rewarded (opt-in): watch AD_FREE_ADS_REQUIRED ads to go ad-free for AD_FREE_MINUTES ----
  adFreeProgress = 0;

  /** Shows one rewarded ad. 'progress' = counted toward unlock, 'rewarded' = ad-free unlocked. */
  async watchForAdFree(): Promise<'rewarded' | 'progress' | 'dismissed' | 'unavailable'> {
    const earned = await this.showRewardedFormat(RewardedAd.createForAdRequest(REWARDED_ID));
    if (earned !== true) return earned === false ? 'dismissed' : 'unavailable';
    this.adFreeProgress++;
    if (this.adFreeProgress < AD_FREE_ADS_REQUIRED) {
      AsyncStorage.setItem(AD_FREE_PROGRESS_KEY, String(this.adFreeProgress)).catch(() => {});
      this.emit();
      return 'progress';
    }
    this.adFreeProgress = 0;
    AsyncStorage.removeItem(AD_FREE_PROGRESS_KEY).catch(() => {});
    this.adFreeUntil = Date.now() + AD_FREE_MINUTES * 60_000;
    AsyncStorage.setItem(AD_FREE_KEY, String(this.adFreeUntil)).catch(() => {});
    this.emit();
    setTimeout(() => this.emit(), AD_FREE_MINUTES * 60_000 + 1000);
    return 'rewarded';
  }

  // ---- rewarded interstitial (opt-in, user is told first): unlock HD export ----
  async watchForHdExport(): Promise<boolean | null> {
    return this.showRewardedFormat(RewardedInterstitialAd.createForAdRequest(REWARDED_INTERSTITIAL_ID));
  }

  /**
   * Loads and shows a rewarded-style ad on demand.
   * Resolves only after the ad is CLOSED so callers never run UI underneath it.
   * true = reward earned, false = closed without reward, null = no ad available.
   */
  private showRewardedFormat(ad: RewardedAd | RewardedInterstitialAd): Promise<boolean | null> {
    if (!this.ready) return Promise.resolve(null);
    return new Promise((resolve) => {
      let earned = false;
      let done = false;
      const subs: (() => void)[] = [];
      const finish = (v: boolean | null) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        subs.forEach((u) => u());
        this.showingFullscreen = false;
        if (v !== null) this.lastFullscreenAt = Date.now();
        resolve(v);
      };
      const timer = setTimeout(() => finish(null), 12_000);
      subs.push(ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        clearTimeout(timer);
        this.showingFullscreen = true;
        ad.show().catch(() => finish(null));
      }));
      subs.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
      subs.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned)));
      subs.push(ad.addAdEventListener(AdEventType.ERROR, () => finish(earned ? true : null)));
      ad.load();
    });
  }
}

export const adsManager = new AdsManager();
