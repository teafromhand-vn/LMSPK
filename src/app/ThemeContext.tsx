import { createContext, useContext, useState, type ReactNode } from 'react';
const ThemeContext = createContext({ dark: false, toggle: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      <div data-theme={dark ? 'dark' : 'light'}>{children}</div>
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
