import { useEffect } from 'react';
import { useAuthStore } from '@bystrobarista/core/stores/authStore';
import { useWhatsNewStore } from '@bystrobarista/core/stores/whatsNewStore';

// Decides once per sign-in whether the "what's new" sheet is due; runs at the
// same moment as the tutorial bootstrap and holds the tutorial while visible.
export const useWhatsNewBootstrap = (): void => {
  const userId = useAuthStore(s => s.user?.id);
  const consentAcceptedAt = useAuthStore(s => s.user?.consentAcceptedAt);

  useEffect(() => {
    const user = useAuthStore.getState().user;
    const whatsNew = useWhatsNewStore.getState();
    if (!user) {
      whatsNew.clear();
      return;
    }
    if (!user.consentAcceptedAt) return;
    void whatsNew.bootstrap(user);
  }, [userId, consentAcceptedAt]);
};
