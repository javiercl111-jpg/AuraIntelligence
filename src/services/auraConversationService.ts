import {
    addDoc,
    collection,
    serverTimestamp,
    getDocs,
    query,
    orderBy,
    limit,
  } from 'firebase/firestore';
  
  import { db } from '../firebase';
  
  import type { AuraConversationAudit } from '../types/auraIntelligence';
  
  const CONVERSATIONS_COLLECTION = 'ai_conversations';
  
  export const saveAuraConversationAudit = async (
    audit: AuraConversationAudit
  ): Promise<void> => {
    try {
      await addDoc(collection(db, CONVERSATIONS_COLLECTION), {
        ...audit,
        createdAt: audit.createdAt || new Date().toISOString(),
        createdAtServer: serverTimestamp(),
      });
    } catch (error) {
      console.error(
        '[Aura Intelligence] Error saving conversation audit:',
        error
      );
    }
  };

  export const listAuraConversations = async (): Promise<AuraConversationAudit[]> => {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, CONVERSATIONS_COLLECTION),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
      );

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AuraConversationAudit, 'id'>),
      } as any));
    } catch (error) {
      console.error(
        '[Aura Intelligence] Error listing conversation audits:',
        error
      );
      return [];
    }
  };

  const conversationService = {
    saveAuraConversationAudit,
    listAuraConversations,
  };

  export default conversationService;