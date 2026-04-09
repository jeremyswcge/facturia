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
