import mobileAds, {
  InterstitialAd,
  RewardedAd,
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
};

const isDev = __DEV__;
export const getBannerId = () => (isDev ? TestIds.BANNER : AD_IDS.banner);
export const getInterstitialId = () => (isDev ? TestIds.INTERSTITIAL : AD_IDS.interstitial);
export const getNativeId = () => (isDev ? TestIds.NATIVE : AD_IDS.native);
export const getRewardedId = () => (isDev ? TestIds.REWARDED : AD_IDS.rewarded);

class AdsManager {
  private interstitial: InterstitialAd;
  private rewarded: RewardedAd;
  private interstitialLoaded = false;
  private rewardedLoaded = false;
  private actionCount = 0;
  private initialized = false;
  private lastInterstitialAt = 0;
  // Minimum gap between interstitials so they show "occasionally" rather than back-to-back.
  private readonly INTERSTITIAL_COOLDOWN_MS = 60_000;
  // How many qualifying actions between interstitials.
  private readonly INTERSTITIAL_EVERY_N_ACTIONS = 3;

  constructor() {
    this.interstitial = InterstitialAd.createForAdRequest(getInterstitialId(), {
      requestNonPersonalizedAdsOnly: true,
    });
    this.rewarded = RewardedAd.createForAdRequest(getRewardedId(), {
      requestNonPersonalizedAdsOnly: true,
    });
  }

  async initialize() {
    if (this.initialized) return;
    try {
      await mobileAds().initialize();

      this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
        this.interstitialLoaded = true;
      });
      this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        this.interstitialLoaded = false;
        this.interstitial.load();
      });
      this.interstitial.addAdEventListener(AdEventType.ERROR, () => {
        this.interstitialLoaded = false;
        setTimeout(() => this.interstitial.load(), 4000);
      });

      this.rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.rewardedLoaded = true;
      });
      this.rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        this.rewardedLoaded = false;
        this.rewarded.load();
      });
      this.rewarded.addAdEventListener(AdEventType.ERROR, () => {
        this.rewardedLoaded = false;
        setTimeout(() => this.rewarded.load(), 4000);
      });

      this.interstitial.load();
      this.rewarded.load();
      this.initialized = true;
    } catch (e) {
      console.log('ads init fail', e);
    }
  }

  maybeShowInterstitial(force = false) {
    this.actionCount++;
    const dueByCount = this.actionCount % this.INTERSTITIAL_EVERY_N_ACTIONS === 0;
    const cooledDown = Date.now() - this.lastInterstitialAt >= this.INTERSTITIAL_COOLDOWN_MS;
    const should = (force || dueByCount) && cooledDown;
    if (!should) return false;
    if (this.interstitialLoaded) {
      try {
        this.interstitial.show();
        this.lastInterstitialAt = Date.now();
        return true;
      } catch {
        return false;
      }
    }

    this.interstitial.load();
    return false;
  }

  async showRewarded(onReward: () => void | Promise<void>, onDismiss?: () => void | Promise<void>) {
    // If no ad is ready, don't make the user wait or silently do nothing -
    // just run the fallback immediately so the core action always completes.
    if (!this.rewardedLoaded) {
      this.rewarded.load();
      if (onDismiss) await onDismiss();
      return false;
    }

    return new Promise<boolean>((resolve) => {
      let rewardGranted = false;
      let settled = false;

      const cleanup = () => {
        removeRewardListener();
        removeCloseListener();
        removeErrorListener();
      };

      const finish = async (result: boolean) => {
        if (settled) return;
        settled = true;
        cleanup();
        this.rewardedLoaded = false;
        this.rewarded.load();
        if (!result && onDismiss) {
          await onDismiss();
        }
        resolve(result);
      };

      const removeRewardListener = this.rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
        rewardGranted = true;
        await onReward();
      });

      const removeCloseListener = this.rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        finish(rewardGranted);
      });

      const removeErrorListener = this.rewarded.addAdEventListener(AdEventType.ERROR, () => {
        finish(false);
      });

      try {
        this.rewarded.show();
      } catch {
        finish(false);
      }
    });
  }
}

export const adsManager = new AdsManager();

