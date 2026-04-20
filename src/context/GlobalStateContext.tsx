import { createContext, useContext, useState, ReactNode } from 'react';
import { JawabanSiswa } from '../types';
import { mockJawabanSiswa } from '../lib/mockData';

interface GlobalStateContextType {
  studentAnswers: JawabanSiswa[];
  updateGrade: (ansId: number, skor: number) => void;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [studentAnswers, setStudentAnswers] = useState<JawabanSiswa[]>(mockJawabanSiswa);

  const updateGrade = (ansId: number, skor: number) => {
    setStudentAnswers(prev => prev.map(ans => 
      ans.id === ansId ? { ...ans, skor } : ans
    ));
  };

  return (
    <GlobalStateContext.Provider value={{ studentAnswers, updateGrade }}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
}
