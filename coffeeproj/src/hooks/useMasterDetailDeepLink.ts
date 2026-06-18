import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, NavigationState, Route } from '@react-navigation/native';

type IdExtractor = (route: Route<string>) => string | null;

type Options = {
  detailRouteName: string;
  extractId: IdExtractor;
  onSelect: (id: string) => void;
};

export const useMasterDetailDeepLink = ({
  detailRouteName,
  extractId,
  onSelect,
}: Options): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<NavigationProp<any>>();

  useEffect(() => {
    const handleState = (state: NavigationState | undefined): void => {
      if (!state) return;
      const route = state.routes[state.index];
      if (route.name !== detailRouteName) return;
      const id = extractId(route);
      if (!id) return;
      // Pop the pushed detail then route the selection into the split pane.
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      onSelect(id);
    };

    const unsubscribe = navigation.addListener('state', e => {
      handleState(e.data.state as NavigationState | undefined);
    });
    return unsubscribe;
  }, [navigation, detailRouteName, extractId, onSelect]);
};
