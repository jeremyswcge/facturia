export type Utilisateur = 'jeremy' | 'melina' | 'commun'

export interface Facture {
  id: string
  emetteur: string
  montant: number
  devise: 'CHF'
  dateReception: string
  dateEcheance?: string
  payee: boolean
  datePaiement?: string
  source: 'gmail' | 'manuel'
  gmailMessageId?: string
  categorie?: string
  notes?: string
  utilisateur?: Utilisateur
  createdAt: string
}

export interface FraisFixes {
  id: string
  nom: string
  montant: number
  devise: 'CHF'
  frequence: 'mensuel' | 'annuel' | 'trimestriel'
  jourPrelevement?: number
  categorie: string
  actif: boolean
  createdAt: string
  // Période de référence (mois/année de début pour les frais à date fixe)
  moisDebut?: string   // "MM"
  anneeDebut?: string  // "YYYY"
  // Pour les annuels : mode de paiement
  modeAnnuel?: 'mensualise' | 'paiement-unique'
  // Pour paiement unique annuel : mois et année du paiement
  moisPaiementAnnuel?: string  // "MM"
  anneePaiementAnnuel?: string // "YYYY"
}

export interface Salaire {
  id: string
  personne: 'Mélina' | 'Jérémy'
  montant: number
  devise: 'CHF'
  jourVersement: number
  actif: boolean
}

export interface MoisResume {
  mois: string
  annee: number
  totalFactures: number
  totalFraisFixes: number
  totalDepenses: number
  totalRevenus: number
  solde: number
  facturesPayees: number
  facturesEnAttente: number
}

export type Categorie =
  | 'loyer'
  | 'internet'
  | 'tv'
  | 'mobile'
  | 'electricite'
  | 'eau'
  | 'assurance'
  | 'transport'
  | 'sante'
  | 'alimentation'
  | 'loisirs'
  | 'autre'
