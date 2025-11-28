import type { Document, Extraction, DashboardData, Template, CeleryWorker, LogEntry } from '@/types'

const fournisseurs = ['OCP', 'CDP', 'ALLIANCE', 'CERP', 'PHOENIX', 'Pfizer', 'Sanofi', 'Biogaran', 'Mylan']
const grossistes = ['OCP', 'CDP', 'ALLIANCE', 'CERP', 'PHOENIX']
const labos = ['Pfizer', 'Sanofi', 'Biogaran', 'Mylan', 'Servier', 'Pierre Fabre']
const designations = [
  'DOLIPRANE 1000MG CPR 8', 'SPASFON LYOC 80MG', 'AMOXICILLINE 500MG GEL 12',
  'DAFALGAN CODEINE', 'ADVIL 400MG CPR 14', 'FERVEX ADULTES SACH 8',
  'KARDEGIC 75MG SACH 30', 'VOLTARENE EMULGEL 1%', 'EFFERALGAN 1G CPR 8',
  'SMECTA ORANGE SACH 30', 'GAVISCON MENTHE FL 300ML', 'LEXOMIL 6MG CPR 30'
]
const templates = ['ocp_v2', 'cdp_v1', 'alliance_v1', 'cerp_v1', 'labo_generic']
const statuses: Document['status'][] = ['AUTO_PROCESSED', 'NEEDS_REVIEW', 'VALIDATED', 'FAILED']

const randomDate = (daysBack: number = 180) => {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack))
  return date.toISOString().split('T')[0]
}

export const generateMockDocuments = (count: number): Document[] => {
  return Array.from({ length: count }, (_, i) => {
    const isGrossiste = Math.random() > 0.3
    const fournisseur = isGrossiste
      ? grossistes[Math.floor(Math.random() * grossistes.length)]
      : labos[Math.floor(Math.random() * labos.length)]
    const totalHt = Math.floor(Math.random() * 5000) + 100
    const tva = totalHt * 0.2

    return {
      id: i + 1,
      nom_fichier: `facture_${fournisseur.toLowerCase()}_${2024000 + i}.pdf`,
      hash_fichier: `sha256_${Math.random().toString(36).substr(2, 16)}`,
      date_extraction: new Date().toISOString(),
      date_derniere_modification: new Date().toISOString(),
      chemin_source: `/uploads/facture_${i}.pdf`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      template_used: templates[Math.floor(Math.random() * templates.length)],
      confidence_score: Math.floor(Math.random() * 30) + 70,
      numero_facture: `FAC-${2024}${String(i).padStart(6, '0')}`,
      date_document: randomDate(),
      date_echeance: randomDate(90),
      net_a_payer: totalHt + tva,
      type_document: 'FACTURE',
      fournisseur,
      categorie_fournisseur: isGrossiste ? 'GROSSISTE' : 'LABO',
      base_ht_tva_20: totalHt,
      total_tva_20: tva,
    }
  })
}

export const generateMockExtractions = (documentId: number, count: number): Extraction[] => {
  return Array.from({ length: count }, (_, i) => {
    const qte = Math.floor(Math.random() * 20) + 1
    const prixHt = Math.floor(Math.random() * 5000) / 100
    const tva = [2.1, 5.5, 10, 20][Math.floor(Math.random() * 4)]

    return {
      id: documentId * 100 + i + 1,
      document_id: documentId,
      code_article: `34009${Math.floor(Math.random() * 10000000)}`,
      designation_article: designations[Math.floor(Math.random() * designations.length)],
      quantite: qte,
      prix_unitaire_ht: prixHt,
      taux_tva: tva,
      montant_ligne_ht: qte * prixHt,
      confidence_score: Math.floor(Math.random() * 20) + 80,
    }
  })
}

export const generateMockDashboardData = (): DashboardData => {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  return {
    total_documents: 1256,
    documents_today: 34,
    success_rate: 97.2,
    avg_confidence: 92.5,
    pending_review: 12,
    failed_today: 2,
    total_ht: 425680,
    total_tva: 85136,
    total_ttc: 510816,
    timeline: Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 50) + 20,
        amount: Math.floor(Math.random() * 20000) + 5000,
      }
    }),
    by_fournisseur: fournisseurs.slice(0, 7).map(name => ({
      name,
      count: Math.floor(Math.random() * 200) + 50,
      amount: Math.floor(Math.random() * 100000) + 20000,
    })).sort((a, b) => b.amount - a.amount),
    by_status: [
      { status: 'Validé', count: 856 },
      { status: 'En attente', count: 280 },
      { status: 'Erreur', count: 120 },
    ],
    by_tva: [
      { taux: '2.1%', base_ht: 12500, tva: 262.5 },
      { taux: '5.5%', base_ht: 45000, tva: 2475 },
      { taux: '10%', base_ht: 68000, tva: 6800 },
      { taux: '20%', base_ht: 300180, tva: 60036 },
    ],
    by_day_of_week: days.map(day => ({
      day,
      count: Math.floor(Math.random() * 200) + 50,
    })),
    by_template: templates.map(name => ({
      name,
      count: Math.floor(Math.random() * 300) + 100,
      success_rate: Math.floor(Math.random() * 15) + 85,
    })),
    alerts: [],
  }
}

export const generateMockTemplates = (): Template[] => {
  return [
    {
      name: 'ocp_v2',
      version: '3.0',
      description: 'Format OCP 2025 avec PFHT unitaire',
      column_count: 10,
      is_active: true,
      detection_rules: {
        required_headers: ['Référence', 'Désignation', 'Qté', 'PFHT'],
      },
      usage_stats: { total_extractions: 456, success_rate: 97.8, avg_confidence: 94.2 },
    },
    {
      name: 'cdp_v1',
      version: '2.1',
      description: 'Format CDP standard',
      column_count: 8,
      is_active: true,
      detection_rules: {
        required_headers: ['Code', 'Libellé', 'Quantité', 'PU HT'],
      },
      usage_stats: { total_extractions: 234, success_rate: 92.5, avg_confidence: 89.1 },
    },
    {
      name: 'alliance_v1',
      version: '1.5',
      description: 'Format Alliance Healthcare',
      column_count: 9,
      is_active: true,
      detection_rules: {
        required_headers: ['Article', 'Description', 'Qté'],
      },
      usage_stats: { total_extractions: 189, success_rate: 94.2, avg_confidence: 91.5 },
    },
    {
      name: 'test_template',
      version: '0.1',
      description: 'Template en cours de test',
      column_count: 6,
      is_active: false,
      detection_rules: {
        required_headers: ['Ref', 'Nom'],
      },
      usage_stats: { total_extractions: 3, success_rate: 66.7, avg_confidence: 72.0 },
    },
  ]
}

export const generateMockWorkers = (): CeleryWorker[] => {
  return [
    {
      hostname: 'celery@worker-1',
      status: 'online',
      active_tasks: 2,
      processed_total: 1234,
      failed_total: 12,
      last_heartbeat: new Date().toISOString(),
      queues: ['extraction', 'validation'],
      current_task: { id: 'task-123', name: 'extract_pdf', started_at: new Date().toISOString() },
    },
    {
      hostname: 'celery@worker-2',
      status: 'busy',
      active_tasks: 5,
      processed_total: 987,
      failed_total: 8,
      last_heartbeat: new Date().toISOString(),
      queues: ['extraction'],
    },
    {
      hostname: 'celery@worker-3',
      status: 'offline',
      active_tasks: 0,
      processed_total: 456,
      failed_total: 3,
      last_heartbeat: new Date(Date.now() - 300000).toISOString(),
      queues: ['extraction'],
    },
  ]
}

export const generateMockLogs = (count: number): LogEntry[] => {
  const levels: LogEntry['level'][] = ['DEBUG', 'INFO', 'WARNING', 'ERROR']
  const sources: LogEntry['source'][] = ['api', 'worker', 'extractor', 'template']
  const messages = [
    'Document #42 extrait avec succès',
    'Task abc123 démarrée',
    'Confidence faible (65%) pour document #38',
    'Template xyz non trouvé',
    'Worker celery@worker-1 connecté',
    'Extraction terminée en 2.3s',
    'Erreur de parsing page 2',
    'Template ocp_v2 sélectionné automatiquement',
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    timestamp: new Date(Date.now() - i * 1000 * Math.random() * 60).toISOString(),
    level: levels[Math.floor(Math.random() * levels.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
  })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
