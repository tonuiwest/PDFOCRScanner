import { useCallback, useEffect, useReducer, useState } from 'react';
import { Alert } from 'react-native';
import { adsManager, AD_FREE_ADS_REQUIRED, AD_FREE_MINUTES } from '../services/adsManager';
import { useToast } from '../components/ui';

/** Re-renders when ad availability changes (SDK ready, consent, ad-free progress/reward). */
export function useAds() {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => adsManager.subscribe(bump), []);
  return {
    canShowAds: adsManager.canShowAds(),
    adFree: adsManager.isAdFree(),
    adFreeMinutes: adsManager.adFreeRemainingMin(),
    adFreeProgress: adsManager.adFreeProgress,
  };
}

/** Guides the user through watching AD_FREE_ADS_REQUIRED rewarded ads to unlock Premium (ad-free) for AD_FREE_MINUTES. */
export function useAdFreeUnlock() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const watchNext = useCallback(async () => {
    setBusy(true);
    const r = await adsManager.watchForAdFree();
    setBusy(false);
    if (r === 'rewarded') {
      toast(`Premium unlocked for ${AD_FREE_MINUTES} minutes`, 'diamond');
    } else if (r === 'progress') {
      const left = AD_FREE_ADS_REQUIRED - adsManager.adFreeProgress;
      Alert.alert(
        `${adsManager.adFreeProgress} of ${AD_FREE_ADS_REQUIRED} done`,
        `Watch ${left} more ${left === 1 ? 'ad' : 'ads'} to unlock ${AD_FREE_MINUTES} minutes of Premium. Your progress is saved.`,
        [{ text: 'Later', style: 'cancel' }, { text: 'Watch next', onPress: () => { watchNext(); } }],
      );
    } else if (r === 'unavailable') {
      Alert.alert('No ad available', 'Please try again in a little while. Your progress is saved.');
    }
  }, [toast]);

  const start = useCallback(() => {
    const done = adsManager.adFreeProgress;
    Alert.alert(
      `Get ${AD_FREE_MINUTES} minutes of Premium`,
      `Watch ${AD_FREE_ADS_REQUIRED} short video ads to unlock ${AD_FREE_MINUTES} minutes of Premium — no ads, uninterrupted scanning.` +
        (done ? `\n\nProgress: ${done} of ${AD_FREE_ADS_REQUIRED} watched.` : ''),
      [{ text: 'Not now', style: 'cancel' }, { text: done ? 'Continue' : 'Watch ad', onPress: () => { watchNext(); } }],
    );
  }, [watchNext]);

  return { start, busy };
}
