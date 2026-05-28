import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Spinner } from '@/components/ui/Spinner'
import { ContactHeader } from './ContactHeader'
import { ContactInfoSection } from './ContactInfoSection'
import { ContactFollowupsSection } from './ContactFollowupsSection'
import { ContactNotesSection } from './ContactNotesSection'
import { useContact } from '@/features/crm/hooks'

interface ContactDetailDrawerProps {
  contactId: string
  open: boolean
  onClose: () => void
}

/**
 * Side-panel view of a prospect over the Kanban (desktop) / fullscreen
 * on mobile. Same sections as the legacy ContactDetailPage but rendered
 * inside a Drawer for less navigation friction.
 */
export function ContactDetailDrawer({ contactId, open, onClose }: ContactDetailDrawerProps) {
  const [pageError, setPageError] = useState<string | null>(null)
  const contactQuery = useContact(contactId)
  const contact = contactQuery.data

  return (
    <Drawer open={open} onClose={onClose} title="Prospect">
      {contactQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" className="text-accent" />
        </div>
      ) : contactQuery.isError || !contact ? (
        <p className="text-sm text-danger">Prospect introuvable.</p>
      ) : (
        <div className="space-y-4">
          <ContactHeader contact={contact} onError={setPageError} hideBackButton />
          {pageError && (
            <div className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2" role="alert">
              {pageError}
            </div>
          )}
          <ContactInfoSection contact={contact} />
          <ContactFollowupsSection contactId={contact.id} onError={setPageError} />
          <ContactNotesSection contactId={contact.id} />
        </div>
      )}
    </Drawer>
  )
}
