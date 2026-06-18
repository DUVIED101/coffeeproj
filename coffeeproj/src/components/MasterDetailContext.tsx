import React from 'react';

export type MasterDetailContextValue = {
  selectedId: string | null;
  select: (id: string | null) => void;
  isTablet: boolean;
};

export const MasterDetailContext = React.createContext<MasterDetailContextValue | undefined>(
  undefined
);

export const useMasterDetail = (): MasterDetailContextValue | undefined =>
  React.useContext(MasterDetailContext);
