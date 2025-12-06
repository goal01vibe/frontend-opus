// Fournisseur Types
export type FournisseurType = 'LABO' | 'GROSSISTE'

export type DocumentStatus = 'AUTO_PROCESSED' | 'NEEDS_REVIEW' | 'IN_CORRECTION' | 'VALIDATED' | 'FAILED'

export type DocumentType = 'FACTURE' | 'BON_RECEPTION' | 'AVOIR'

export type AlertType =
  | 'LOW_CONFIDENCE'
  | 'TVA_MISMATCH'
  | 'DUPLICATE_INVOICE'
  | 'EXPIRATION_WARNING'
  | 'AMOUNT_ANOMALY'
  | 'MISSING_DATA'
  | 'MATH_ERROR'

export type AlertSeverity = 'info' | 'warning' | 'error'

// Document (Facture métadonnées)
export interface Document {
  id: number
  nom_fichier: string
  hash_fichier: string
  date_extraction: string
  date_derniere_modification: string
  chemin_source: string
  status: DocumentStatus
  template_used: string
  confidence_score: number
  numero_facture: string
  date_document: string
  date_echeance: string
  net_a_payer: number
  type_document: DocumentType
  fournisseur: string
  categorie_fournisseur: FournisseurType
  operateur?: string
  heure_document?: string
  // TVA Bases HT
  base_ht_tva_2_1?: number
  base_ht_tva_5_5?: number
  base_ht_tva_10?: number
  base_ht_tva_20?: number
  // TVA Montants
  total_tva_2_1?: number
  total_tva_5_5?: number
  total_tva_10?: number
  total_tva_20?: number
  alerts?: Alert[]
}

// Type produit BDPM
export type TypeProduit = 'MEDICAMENT' | 'AUTRE' | null

// Taux de remboursement BDPM
export type TauxRemboursement = '100%' | '65%' | '30%' | '15%' | 'NR' | null

// Extraction (ligne de facture)
export interface Extraction {
  id: number
  document_id: number
  cat?: string
  categorie?: string
  code_article: string
  designation_article: string
  numero_lot?: string
  date_peremption?: string
  quantite: number
  quantite_receptionnee?: number
  prix_unitaire_ht: number
  pfht_unitaire?: number
  remise_taux?: number
  prix_net_unitaire_ht?: number
  taux_tva: number
  montant_ligne_ht: number
  confidence_score: number
  error_details?: string
  // BDPM enrichment
  type_produit?: TypeProduit
  taux_remboursement?: TauxRemboursement
  bounding_box?: {
    page: number
    x1: number
    y1: number
    x2: number
    y2: number
  }
}

// Alert
export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  message: string
  document_id?: number
  extraction_id?: number
  created_at: string
  resolved: boolean
}

// Template
export interface Template {
  name: string
  version: string
  description: string
  column_count: number
  is_active?: boolean
  detection_rules: {
    required_headers?: string[]
    required_text?: string[]
    header_patterns?: string[]
    column_count?: number
    confidence_weights?: Record<string, number>
  }
  usage_stats?: {
    total_extractions: number
    success_rate: number
    avg_confidence: number
  }
}

// Batch Progress
export interface BatchProgress {
  batch_id: string
  total_files: number
  completed: number
  failed: number
  current_file?: string
  workers_active: number
  estimated_time_remaining?: number
  started_at: string
}

export interface BatchTask {
  task_id: string
  file: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  progress: number
  document_id?: number
  error?: string
}

// Worker Celery
export interface CeleryWorker {
  hostname: string
  status: 'online' | 'offline' | 'busy'
  active_tasks: number
  processed_total: number
  failed_total: number
  last_heartbeat: string
  queues: string[]
  current_task?: {
    id: string
    name: string
    started_at: string
  }
}

// Log Entry
export interface LogEntry {
  id: string
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  source: 'api' | 'worker' | 'extractor' | 'template'
  message: string
  metadata?: Record<string, unknown>
  document_id?: number
  task_id?: string
}

// Dashboard Data
export interface DashboardData {
  total_documents: number
  documents_today: number
  success_rate: number
  avg_confidence: number
  pending_review: number
  failed_today: number
  total_ht: number
  total_tva: number
  total_ttc: number
  timeline: { date: string; count: number; amount: number }[]
  by_fournisseur: { name: string; count: number; amount: number }[]
  by_status: { status: string; count: number }[]
  by_tva: { taux: string; base_ht: number; tva: number }[]
  by_day_of_week: { day: string; count: number }[]
  by_template: { name: string; count: number; success_rate: number }[]
  alerts: Alert[]
}

// Filters
export interface FilterState {
  fournisseur?: string[]
  dateRange?: { from: Date; to: Date }
  status?: DocumentStatus[]
  confidence?: { min: number; max: number }
  designation?: string
  codeArticle?: string
  tauxTva?: number[]
  montantMin?: number
  montantMax?: number
}

// API Response
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

// Extract Response
export interface ExtractResponse {
  success: boolean
  document_id: number
  nom_fichier: string
  template_used: string
  confidence_score: number
  metadata: Partial<Document>
  extractions: Extraction[]
  statistics: {
    total_rows: number
    total_ht: number
    total_tva: number
    total_ttc: number
  }
  alerts: Alert[]
}

// Extraction Error Types
export type ExtractionErrorCode =
  | 'ERROR_CORRUPT'
  | 'ERROR_ENCRYPTED'
  | 'ERROR_SCANNED'
  | 'ERROR_TOO_LARGE'
  | 'WARNING_NO_TEMPLATE'
  | 'WARNING_PARTIAL'
  | 'ERROR_NETWORK'
  | 'ERROR_UNKNOWN'

export interface ExtractionError {
  code: ExtractionErrorCode
  message: string
  recoverable: boolean
  suggestion?: string
}

// File Status for upload tracking
export type FileUploadStatus = 'pending' | 'validating' | 'uploading' | 'processing' | 'complete' | 'failed' | 'partial'

export interface FileStatus {
  id: string
  file: File
  filename: string
  size: number
  status: FileUploadStatus
  progress: number
  error?: ExtractionError
  documentId?: number
  redisKey?: string
  startedAt?: string
  completedAt?: string
}

// Batch Result
export interface BatchResult {
  batch_id: string
  total: number
  completed: number
  failed: number
  partial: number
  files: FileResult[]
}

export interface FileResult {
  file_id: string
  filename: string
  status: 'complete' | 'failed' | 'partial'
  document_id?: number
  redis_key?: string
  error?: ExtractionError
}

// Live Metrics
export interface LiveMetrics {
  docsPerSecond: number
  successRate: number
  estimatedTimeRemaining: number
  activeWorkers: number
  totalProcessed: number
  totalFailed: number
}
