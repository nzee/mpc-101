import { createContext, useContext } from 'react';

export const ELI5Context = createContext(false);
export const useELI5 = () => useContext(ELI5Context);
