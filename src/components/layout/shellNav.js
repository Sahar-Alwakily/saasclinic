import { createContext, useContext } from 'react';

export const ShellNavContext = createContext({ open: false, setOpen: () => {} });
export const useShellNav = () => useContext(ShellNavContext);
