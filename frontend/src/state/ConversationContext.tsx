import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import {
  conversationReducer,
  initialConversationState,
  type ConversationAction,
  type ConversationState,
} from './conversationReducer';

interface ConversationContextValue {
  state: ConversationState;
  dispatch: Dispatch<ConversationAction>;
}

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, initialConversationState);
  return (
    <ConversationContext.Provider value={{ state, dispatch }}>{children}</ConversationContext.Provider>
  );
}

export function useConversation(): ConversationContextValue {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error('useConversation must be used within ConversationProvider');
  }
  return ctx;
}
