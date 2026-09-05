import { useEffect } from 'react';
import { useAuthStore } from '@bystrobarista/core/stores/authStore';
import { useTutorialStore } from '@bystrobarista/core/stores/tutorialStore';

// Starts the first-run tutorial once the signed-in user has passed the
// consent gate (i.e. MainTabs is about to render) and clears it on sign-out.
export const useTutorialBootstrap = (): void => {
  const userId = useAuthStore(s => s.user?.id);
  const consentAcceptedAt = useAuthStore(s => s.user?.consentAcceptedAt);
  const accountType = useAuthStore(s => s.user?.accountType);

  useEffect(() => {
    const user = useAuthStore.getState().user;
    const tutorial = useTutorialStore.getState();
    if (!user) {
      tutorial.clear();
      return;
    }
    if (!user.consentAcceptedAt) return;
    void tutorial.bootstrap(user);
  }, [userId, consentAcceptedAt, accountType]);
};
