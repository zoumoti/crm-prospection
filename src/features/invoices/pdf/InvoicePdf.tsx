import { Document, Page, View, Text, Image } from '@react-pdf/renderer'
import { styles } from './styles'
import { formatCurrency, formatDateShort } from '../totals'
import type { Invoice, InvoiceLine, Client, CompanySettings } from '@/types/database'

export interface InvoicePdfProps {
  invoice: Invoice
  lines: InvoiceLine[]
  client: Client
  settings: CompanySettings
  logoBase64: string | null
}

function PdfHeader({ logoBase64, invoiceNumber }: { logoBase64: string | null; invoiceNumber: string }) {
  return (
    <View style={styles.header}>
      <View style={{ width: 64 }}>
        {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
      </View>
      <Text style={styles.invoiceNumber}>Facture n°{invoiceNumber}</Text>
      <View style={{ width: 64 }} />
    </View>
  )
}

function PartiesBlock({ settings, client }: { settings: CompanySettings; client: Client }) {
  return (
    <View style={styles.parties}>
      <View style={styles.partyBlock}>
        <Text style={styles.partyTitle}>Émetteur</Text>
        {settings.legal_name && <Text style={styles.partyLine}>{settings.legal_name}</Text>}
        {settings.commercial_name && <Text style={styles.partyLine}>{settings.commercial_name}</Text>}
        {settings.address && <Text style={styles.partyLine}>{settings.address}</Text>}
        {settings.phone && <Text style={styles.partyLine}>Téléphone : {settings.phone}</Text>}
        {settings.siret && <Text style={styles.partyLine}>SIRET : {settings.siret}</Text>}
        {settings.iban && <Text style={styles.partyLine}>IBAN : {settings.iban}</Text>}
        {settings.bic && <Text style={styles.partyLine}>BIC : {settings.bic}</Text>}
      </View>
      <View style={styles.partyBlock}>
        <Text style={styles.partyTitle}>Destinataire</Text>
        <Text style={styles.partyLine}>
          A : {client.first_name} {client.last_name}
        </Text>
        {client.company && <Text style={styles.partyLine}>{client.company}</Text>}
        {client.address && <Text style={styles.partyLine}>{client.address}</Text>}
        <Text style={[styles.partyLine, { marginTop: 4 }]}>Code client : {client.code_client}</Text>
      </View>
    </View>
  )
}

function MetaBlock({ invoice }: { invoice: Invoice }) {
  const dueText = invoice.due_date ? formatDateShort(invoice.due_date) : 'À réception'
  return (
    <View style={styles.meta}>
      <Text>
        <Text style={styles.metaLabel}>Date : </Text>
        {formatDateShort(invoice.invoice_date)}
      </Text>
      <Text>
        <Text style={styles.metaLabel}>Échéance : </Text>
        {dueText}
      </Text>
      <Text>
        <Text style={styles.metaLabel}>Règlement : </Text>
        {invoice.payment_method}
      </Text>
    </View>
  )
}

function LinesTable({ lines }: { lines: InvoiceLine[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.colRef}>Référence</Text>
        <Text style={styles.colDesc}>Description</Text>
        <Text style={styles.colPrice}>PU HT</Text>
        <Text style={styles.colQty}>Qté</Text>
        <Text style={styles.colTotal}>Montant HT</Text>
      </View>
      {lines.map((l) => (
        <View key={l.id} style={styles.tableRow}>
          <Text style={styles.colRef}>{l.reference ?? ''}</Text>
          <Text style={styles.colDesc}>{l.description}</Text>
          <Text style={styles.colPrice}>{formatCurrency(l.unit_price_ht)}</Text>
          <Text style={styles.colQty}>{l.quantity}</Text>
          <Text style={styles.colTotal}>{formatCurrency(l.total_ht)}</Text>
        </View>
      ))}
    </View>
  )
}

function TotalsBlock({ totalHt }: { totalHt: number }) {
  return (
    <View style={styles.totalsBlock}>
      <View style={styles.totalsRow}>
        <Text>€HT</Text>
        <Text>{formatCurrency(totalHt)}</Text>
      </View>
      <View style={styles.totalsRowFinal}>
        <Text>TOTAL €</Text>
        <Text>{formatCurrency(totalHt)}</Text>
      </View>
    </View>
  )
}

function PdfFooter({ vatMention }: { vatMention: string | null }) {
  return (
    <View style={styles.footer}>
      <Text>Merci pour votre confiance.</Text>
      {vatMention && <Text>{vatMention}</Text>}
    </View>
  )
}

export function InvoicePdf({ invoice, lines, client, settings, logoBase64 }: InvoicePdfProps) {
  return (
    <Document
      title={`Facture ${invoice.invoice_number}`}
      author={settings.legal_name ?? ''}
    >
      <Page size="A4" style={styles.page}>
        <PdfHeader logoBase64={logoBase64} invoiceNumber={invoice.invoice_number} />
        <PartiesBlock settings={settings} client={client} />
        <MetaBlock invoice={invoice} />
        <LinesTable lines={lines} />
        <TotalsBlock totalHt={invoice.total_ht} />
        <PdfFooter vatMention={invoice.vat_mention} />
      </Page>
    </Document>
  )
}
