import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { CompanySettings, Expense, Invoice, Client } from '@/types/database'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#1A1F2A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  logo: { width: 64, height: 64 },
  brand: { fontSize: 14, fontWeight: 700 },
  small: { fontSize: 9, color: '#737A86' },
  h1: { fontSize: 16, fontWeight: 700, marginVertical: 8 },
  h2: { fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 6, color: '#10B981' },
  row: { flexDirection: 'row', borderBottom: '1px solid #EBEDF0', paddingVertical: 4 },
  th: { fontWeight: 700, paddingHorizontal: 4 },
  td: { paddingHorizontal: 4 },
  right: { textAlign: 'right' },
  total: { fontWeight: 700, marginTop: 8, fontSize: 11 },
  bilan: { marginTop: 24, padding: 12, backgroundColor: '#F4F6F8', borderRadius: 8 },
  bilanLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bilanNet: { fontSize: 14, fontWeight: 700, color: '#10B981', marginTop: 6 },
})

export interface RevenueLine {
  date: string  // YYYY-MM-DD
  invoiceNumber: string
  clientName: string
  amount: number
}

export interface ExpenseLine {
  date: string
  category: string
  description: string
  amount: number
}

export interface BilanPdfProps {
  company: CompanySettings | null
  logoDataUrl: string | null
  periodLabel: string
  revenues: RevenueLine[]
  expenses: ExpenseLine[]
}

function eur(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(n)
}

function frDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function BilanPdf({
  company,
  logoDataUrl,
  periodLabel,
  revenues,
  expenses,
}: BilanPdfProps) {
  const totalRev = revenues.reduce((s, r) => s + r.amount, 0)
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0)
  const net = totalRev - totalExp

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              {company?.commercial_name || company?.legal_name || 'Mon entreprise'}
            </Text>
            <Text style={styles.small}>SIRET: {company?.siret ?? '—'}</Text>
            <Text style={styles.small}>{company?.address ?? ''}</Text>
          </View>
          {logoDataUrl && <Image src={logoDataUrl} style={styles.logo} />}
        </View>

        <Text style={styles.h1}>Bilan financier — {periodLabel}</Text>

        <Text style={styles.h2}>Revenus</Text>
        <View style={styles.row}>
          <Text style={[styles.th, { width: '15%' }]}>Date</Text>
          <Text style={[styles.th, { width: '15%' }]}>N° facture</Text>
          <Text style={[styles.th, { width: '45%' }]}>Client</Text>
          <Text style={[styles.th, styles.right, { width: '25%' }]}>Montant HT</Text>
        </View>
        {revenues.length === 0 && (
          <Text style={[styles.td, styles.small, { marginTop: 4 }]}>Aucun revenu sur la période.</Text>
        )}
        {revenues.map((r, i) => (
          <View key={i} style={styles.row}>
            <Text style={[styles.td, { width: '15%' }]}>{frDate(r.date)}</Text>
            <Text style={[styles.td, { width: '15%' }]}>{r.invoiceNumber}</Text>
            <Text style={[styles.td, { width: '45%' }]}>{r.clientName}</Text>
            <Text style={[styles.td, styles.right, { width: '25%' }]}>{eur(r.amount)}</Text>
          </View>
        ))}
        <Text style={[styles.total, styles.right]}>Total revenus : {eur(totalRev)}</Text>

        <Text style={styles.h2}>Dépenses</Text>
        <View style={styles.row}>
          <Text style={[styles.th, { width: '15%' }]}>Date</Text>
          <Text style={[styles.th, { width: '25%' }]}>Catégorie</Text>
          <Text style={[styles.th, { width: '35%' }]}>Description</Text>
          <Text style={[styles.th, styles.right, { width: '25%' }]}>Montant</Text>
        </View>
        {expenses.length === 0 && (
          <Text style={[styles.td, styles.small, { marginTop: 4 }]}>Aucune dépense sur la période.</Text>
        )}
        {expenses.map((e, i) => (
          <View key={i} style={styles.row}>
            <Text style={[styles.td, { width: '15%' }]}>{frDate(e.date)}</Text>
            <Text style={[styles.td, { width: '25%' }]}>{e.category}</Text>
            <Text style={[styles.td, { width: '35%' }]}>{e.description}</Text>
            <Text style={[styles.td, styles.right, { width: '25%' }]}>{eur(e.amount)}</Text>
          </View>
        ))}
        <Text style={[styles.total, styles.right]}>Total dépenses : {eur(totalExp)}</Text>

        <View style={styles.bilan}>
          <View style={styles.bilanLine}>
            <Text>Total revenus</Text>
            <Text>{eur(totalRev)}</Text>
          </View>
          <View style={styles.bilanLine}>
            <Text>Total dépenses</Text>
            <Text>{eur(totalExp)}</Text>
          </View>
          <View style={styles.bilanLine}>
            <Text style={styles.bilanNet}>Bénéfice net</Text>
            <Text style={styles.bilanNet}>{eur(net)}</Text>
          </View>
        </View>

        <Text style={[styles.small, { marginTop: 16 }]}>
          Note: revenus comptabilisés selon date d'encaissement (paid_at). Document
          généré automatiquement par Business OS le {new Date().toLocaleDateString('fr-FR')}.
        </Text>
      </Page>
    </Document>
  )
}

export type { Invoice, Expense, Client }
