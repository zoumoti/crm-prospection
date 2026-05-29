// =====================================================================
// Clients
// =====================================================================
export type PortalLink = {
  label: string
  url: string
}

export type Client = {
  id: string
  user_id: string
  code_client: string
  first_name: string
  last_name: string
  company: string | null
  siret: string | null
  address: string | null
  email: string | null
  phone: string | null
  instagram: string | null
  linkedin: string | null
  tiktok: string | null
  notes: string | null
  start_date: string | null
  portal_links: PortalLink[]
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type ClientInsert = Omit<
  Client,
  'id' | 'code_client' | 'created_at' | 'updated_at' | 'archived_at'
>

export type ClientUpdate = Partial<
  Omit<Client, 'id' | 'user_id' | 'code_client' | 'created_at' | 'updated_at'>
>

// =====================================================================
// Company settings (1 row per user)
// =====================================================================
export type TaxPeriodType = 'monthly' | 'quarterly'

export type CompanySettings = {
  user_id: string
  legal_name: string | null
  commercial_name: string | null
  address: string | null
  siret: string | null
  iban: string | null
  bic: string | null
  phone: string | null
  email: string | null
  vat_mention: string | null
  logo_path: string | null
  tax_rate: number | null
  tax_acre: boolean
  tax_frequency: TaxPeriodType
  updated_at: string
}

export type CompanySettingsUpsert = Partial<Omit<CompanySettings, 'updated_at'>> & {
  user_id: string
}

// =====================================================================
// Products
// =====================================================================
export type Product = {
  id: string
  user_id: string
  reference: string
  description: string
  default_price_ht: number | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'archived_at'>
export type ProductUpdate = Partial<Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// =====================================================================
// Invoices
// =====================================================================
export type InvoiceStatus = 'pending' | 'paid'

export type Invoice = {
  id: string
  user_id: string
  client_id: string
  invoice_number: string
  invoice_date: string
  due_date: string | null
  payment_method: string
  status: InvoiceStatus
  total_ht: number
  vat_mention: string | null
  paid_at: string | null
  imported_pdf_path: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type InvoiceInsert = Omit<
  Invoice,
  | 'id'
  | 'invoice_number'
  | 'created_at'
  | 'updated_at'
  | 'archived_at'
  | 'paid_at'
  | 'imported_pdf_path'
> & {
  // Optional manual override; if omitted/null, the SQL trigger auto-assigns F00001+
  invoice_number?: string | null
  // Set by createInvoice after a successful Storage upload (imported invoices only).
  imported_pdf_path?: string | null
}

export type InvoiceUpdate = Partial<
  Omit<Invoice, 'id' | 'user_id' | 'invoice_number' | 'created_at' | 'updated_at'>
>

export type InvoiceLine = {
  id: string
  invoice_id: string
  position: number
  reference: string | null
  description: string
  unit_price_ht: number
  quantity: number
  total_ht: number
  created_at: string
}

export type InvoiceLineInsert = Omit<InvoiceLine, 'id' | 'created_at'>

// =====================================================================
// Tasks
// =====================================================================
export type TaskAssignee = 'owner' | 'client'
export type TaskPriority = 'high' | 'normal' | 'low'
export type TaskCompletedBy = 'owner' | 'client'

export type Task = {
  id: string
  owner_id: string
  client_id: string | null
  assignee: TaskAssignee
  title: string
  notes: string | null
  due_date: string | null
  priority: TaskPriority
  completed: boolean
  completed_at: string | null
  completed_by: TaskCompletedBy | null
  created_at: string
  updated_at: string
}

export type TaskInsert = Omit<
  Task,
  'id' | 'created_at' | 'updated_at' | 'completed_at' | 'completed_by'
> & {
  // The api layer fills owner_id from auth.user.id
  owner_id?: string
}

export type TaskUpdate = Partial<
  Omit<Task, 'id' | 'owner_id' | 'created_at' | 'updated_at'>
>

// =====================================================================
// Contracts
// =====================================================================
export type Contract = {
  id: string
  user_id: string
  client_id: string
  name: string
  signed_at: string         // ISO date 'YYYY-MM-DD'
  storage_path: string
  file_name: string
  file_size: number
  mime_type: string
  notes: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type ContractInsert = Omit<
  Contract,
  'id' | 'created_at' | 'updated_at' | 'archived_at'
> & { id?: string }

export type ContractUpdate = Partial<
  Omit<Contract, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>

// =====================================================================
// Expenses
// =====================================================================
export type Expense = {
  id: string
  user_id: string
  amount: number
  category: string
  description: string
  expense_date: string  // 'YYYY-MM-DD'
  storage_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type ExpenseInsert = Omit<
  Expense,
  'id' | 'created_at' | 'updated_at' | 'archived_at'
> & { id?: string }

export type ExpenseUpdate = Partial<
  Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>

// =====================================================================
// Tax declarations (snapshot des cotisations marquées payées)
// =====================================================================
export type TaxDeclaration = {
  id: string
  user_id: string
  period_type: TaxPeriodType
  period_year: number
  period_index: number
  ca_brut_snapshot: number
  rate_snapshot: number
  acre_snapshot: boolean
  amount_due_snapshot: number
  paid_at: string
  created_at: string
}

export type TaxDeclarationInsert = Omit<
  TaxDeclaration,
  'id' | 'created_at' | 'paid_at'
> & { paid_at?: string }

// =====================================================================
// CRM — Contacts (prospects)
// =====================================================================
export type ContactStage =
  | 'to_contact' | 'message_sent' | 'replied'
  | 'booking_link_sent' | 'call_booked'
  | 'closed_won' | 'closed_lost'

export type ContactSource =
  | 'linkedin' | 'instagram' | 'twitter' | 'tiktok' | 'email' | 'other'

export type Contact = {
  id: string
  user_id: string
  first_name: string
  last_name: string
  company: string | null
  job_title: string | null
  email: string | null
  phone: string | null
  source: ContactSource | null
  source_url: string | null
  niche: string | null
  stage: ContactStage
  loom_url: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type ContactInsert = Omit<
  Contact,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'archived_at'
> & { user_id?: string }

export type ContactUpdate = Partial<
  Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>

// =====================================================================
// CRM — Followups
// =====================================================================
export type FollowupType = 'prospect_followup' | 'conversation_followup'
export type FollowupStatus = 'pending' | 'done' | 'cancelled'

export type Followup = {
  id: string
  contact_id: string
  type: FollowupType
  followup_index: number | null
  scheduled_at: string
  status: FollowupStatus
  done_at: string | null
  cancelled_at: string | null
  note: string | null
  created_at: string
}

export type FollowupInsert = Omit<
  Followup,
  'id' | 'created_at' | 'status' | 'done_at' | 'cancelled_at'
>

export type FollowupUpdate = Partial<
  Omit<Followup, 'id' | 'contact_id' | 'created_at'>
>

// =====================================================================
// CRM — Interactions (timeline append-only)
// =====================================================================
export type InteractionType =
  | 'stage_change' | 'note' | 'followup_created'
  | 'followup_done' | 'followup_cancelled' | 'auto_closed_lost'

export type Interaction = {
  id: string
  contact_id: string
  type: InteractionType
  payload: Record<string, unknown>
  created_at: string
}

export type InteractionInsert = Omit<Interaction, 'id' | 'created_at'>
export type InteractionUpdate = Partial<Pick<Interaction, 'payload'>>

// =====================================================================
// CRM — Prospection settings (1 row per user)
// =====================================================================
export type ProspectionSettings = {
  user_id: string
  weekly_message_goal: number | null
  weekly_call_goal: number | null
  followup_1_days: number
  followup_2_days: number
  conversation_followup_days: number
  max_followups: number
  telegram_chat_id: string | null
  telegram_link_code: string | null
  daily_recap_enabled: boolean
  daily_recap_hour: number
  updated_at: string
}

export type ProspectionSettingsUpsert =
  Partial<Omit<ProspectionSettings, 'user_id' | 'updated_at'>> & { user_id: string }

// =====================================================================
// Database (postgrest-js)
// =====================================================================
export type Database = {
  public: {
    Tables: {
      clients: {
        Row: Client
        Insert: ClientInsert
        Update: ClientUpdate
        Relationships: []
      }
      company_settings: {
        Row: CompanySettings
        Insert: CompanySettingsUpsert
        Update: Partial<Omit<CompanySettings, 'user_id' | 'updated_at'>>
        Relationships: []
      }
      contracts: {
        Row: Contract
        Insert: ContractInsert
        Update: ContractUpdate
        Relationships: []
      }
      products: {
        Row: Product
        Insert: ProductInsert
        Update: ProductUpdate
        Relationships: []
      }
      invoices: {
        Row: Invoice
        Insert: InvoiceInsert
        Update: InvoiceUpdate
        Relationships: []
      }
      invoice_lines: {
        Row: InvoiceLine
        Insert: InvoiceLineInsert
        Update: Partial<Omit<InvoiceLine, 'id' | 'created_at'>>
        Relationships: []
      }
      tasks: {
        Row: Task
        Insert: TaskInsert
        Update: TaskUpdate
        Relationships: []
      }
      expenses: {
        Row: Expense
        Insert: ExpenseInsert
        Update: ExpenseUpdate
        Relationships: []
      }
      tax_declarations: {
        Row: TaxDeclaration
        Insert: TaxDeclarationInsert
        Update: Partial<Omit<TaxDeclaration, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      contacts: {
        Row: Contact
        Insert: ContactInsert
        Update: ContactUpdate
        Relationships: []
      }
      followups: {
        Row: Followup
        Insert: FollowupInsert
        Update: FollowupUpdate
        Relationships: []
      }
      interactions: {
        Row: Interaction
        Insert: InteractionInsert
        Update: InteractionUpdate
        Relationships: []
      }
      prospection_settings: {
        Row: ProspectionSettings
        Insert: ProspectionSettingsUpsert
        Update: Partial<Omit<ProspectionSettings, 'user_id' | 'updated_at'>>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      update_invoice_with_lines: {
        Args: {
          p_invoice_id: string
          p_client_id: string
          p_invoice_date: string
          p_due_date: string | null
          p_payment_method: string
          p_total_ht: number
          p_vat_mention: string | null
          p_lines: unknown
        }
        Returns: Invoice
      }
      change_contact_stage: {
        Args: {
          p_contact_id: string
          p_new_stage: ContactStage
        }
        Returns: ContactStage
      }
      complete_followup: {
        Args: {
          p_followup_id: string
          p_note: string | null
        }
        Returns: void
      }
    }
  }
}
