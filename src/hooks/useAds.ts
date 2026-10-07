import { useCallback, useEffect, useReducer, useState } from 'react';
import { Alert } from 'react-native';
import { adsManager, AD_FREE_ADS_REQUIRED, AD_FREE_MINUTES } from '../services/adsManager';
import { useToast } from '../components/ui';
import { t } from '../i18n';

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
      toast(t('premiumUnlocked', { min: AD_FREE_MINUTES }), 'diamond');
    } else if (r === 'progress') {
      const done = adsManager.adFreeProgress;
      Alert.alert(
        t('premiumStepTitle', { done, total: AD_FREE_ADS_REQUIRED }),
        t('premiumStepBody', { left: AD_FREE_ADS_REQUIRED - done, min: AD_FREE_MINUTES }),
        [{ text: t('later'), style: 'cancel' }, { text: t('watchNext'), onPress: () => { watchNext(); } }],
      );
    } else if (r === 'unavailable') {
      Alert.alert(t('noAdTitle'), t('noAdBodySaved'));
    }
  }, [toast]);

  const start = useCallback(() => {
    const done = adsManager.adFreeProgress;
    Alert.alert(
      t('premiumTitle', { min: AD_FREE_MINUTES }),
      t('premiumBody', { n: AD_FREE_ADS_REQUIRED, min: AD_FREE_MINUTES }) +
        (done ? `\n\n${t('premiumProgressLine', { done, total: AD_FREE_ADS_REQUIRED })}` : ''),
      [{ text: t('notNow'), style: 'cancel' }, { text: done ? t('continue') : t('watchAd'), onPress: () => { watchNext(); } }],
    );
  }, [watchNext]);

  return { start, busy };
}
