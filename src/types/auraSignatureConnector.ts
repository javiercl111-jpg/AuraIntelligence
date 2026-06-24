export interface AuraSignatureDocumentsContext {
    totalDocuments: number;
    pendingSignature: number;
    signedToday: number;
    sealedDocuments: number;
    rejectedDocuments: number;
    expiredDocuments: number;
  }
  
  export interface AuraSignatureTemplatesContext {
    totalTemplates: number;
    activeTemplates: number;
    draftTemplates: number;
  }
  
  export interface AuraSignatureEnvelopesContext {
    totalEnvelopes: number;
    pendingEnvelopes: number;
    completedEnvelopes: number;
    sealedEnvelopes: number;
  }
  
  export interface AuraSignatureConnectorContext {
    companyId: string;
    generatedAt: string;
    documents: AuraSignatureDocumentsContext;
    templates: AuraSignatureTemplatesContext;
    envelopes: AuraSignatureEnvelopesContext;
  }