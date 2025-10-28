import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ClueCollection } from '../models/ClueCollection';

interface CollectionContextType {
  currentCollection: ClueCollection | null;
  setCurrentCollection: (collection: ClueCollection | null) => void;
}

const CollectionContext = createContext<CollectionContextType | undefined>(undefined);

export const useCollection = () => {
  const context = useContext(CollectionContext);
  if (context === undefined) {
    throw new Error('useCollection must be used within a CollectionProvider');
  }
  return context;
};

interface CollectionProviderProps {
  children: ReactNode;
}

export const CollectionProvider: React.FC<CollectionProviderProps> = ({ children }) => {
  const [currentCollection, setCurrentCollection] = useState<ClueCollection | null>(null);

  return (
    <CollectionContext.Provider value={{ currentCollection, setCurrentCollection }}>
      {children}
    </CollectionContext.Provider>
  );
};
