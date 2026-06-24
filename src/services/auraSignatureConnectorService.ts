import {
    collection,
    getDocs,
    query,
    where,
  } from 'firebase/firestore';
  
  import { db } from '../firebase';
  
  import type {
    AuraSignatureConnectorContext,
  } from '../types/auraSignatureConnector';
  
  const getCollectionByCompany = async (
    collectionName: string,
    companyId: string
  ): Promise<any[]> => {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, collectionName),
          where('companyId', '==', companyId)
        )
      );
  
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(
        `[Aura Signature Connector] Error loading ${collectionName}:`,
        error
      );
  
      return [];
    }
  };
  
  const isToday = (value?: string): boolean => {
    if (!value) return false;
  
    const today = new Date().toISOString().slice(0, 10);
  
    return value.startsWith(today);
  };
  
  export const buildAuraSignatureConnectorContext = async (
    companyId: string
  ): Promise<AuraSignatureConnectorContext> => {
    const [documents, templates, envelopes] = await Promise.all([
      getCollectionByCompany('signatureDocuments', companyId),
      getCollectionByCompany('signatureTemplates', companyId),
      getCollectionByCompany('auraSignatureEnvelopes', companyId),
    ]);
  
    return {
      companyId,
      generatedAt: new Date().toISOString(),
  
      documents: {
        totalDocuments: documents.length,
        pendingSignature: documents.filter((document) =>
          ['pending', 'pending_signature', 'sent'].includes(
            String(document.status || '').toLowerCase()
          )
        ).length,
        signedToday: documents.filter((document) =>
          isToday(document.signedAt || document.completedAt || document.updatedAt)
        ).length,
        sealedDocuments: documents.filter((document) =>
          ['sealed', 'completed_sealed'].includes(
            String(document.status || '').toLowerCase()
          )
        ).length,
        rejectedDocuments: documents.filter((document) =>
          ['rejected', 'declined'].includes(
            String(document.status || '').toLowerCase()
          )
        ).length,
        expiredDocuments: documents.filter((document) =>
          ['expired'].includes(String(document.status || '').toLowerCase())
        ).length,
      },
  
      templates: {
        totalTemplates: templates.length,
        activeTemplates: templates.filter(
          (template) =>
            String(template.status || '').toLowerCase() === 'active' ||
            template.isActive === true
        ).length,
        draftTemplates: templates.filter(
          (template) =>
            String(template.status || '').toLowerCase() === 'draft'
        ).length,
      },
  
      envelopes: {
        totalEnvelopes: envelopes.length,
        pendingEnvelopes: envelopes.filter((envelope) =>
          ['pending', 'sent', 'in_progress'].includes(
            String(envelope.status || '').toLowerCase()
          )
        ).length,
        completedEnvelopes: envelopes.filter((envelope) =>
          ['completed', 'signed'].includes(
            String(envelope.status || '').toLowerCase()
          )
        ).length,
        sealedEnvelopes: envelopes.filter((envelope) =>
          ['sealed'].includes(String(envelope.status || '').toLowerCase())
        ).length,
      },
    };
  };