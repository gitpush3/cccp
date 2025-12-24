import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Phone, Building, Users } from "lucide-react";

interface ContactsListProps {
  city: string;
}

export function ContactsList({ city }: ContactsListProps) {
  const contacts = useQuery(api.contacts.getContactsByCity, { city });

    if (!contacts) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const govContacts = contacts.filter(c => c.type === "gov");
  const commercialContacts = contacts.filter(c => c.type === "commercial");

  return (
    <div className="p-4 space-y-6">
      {govContacts.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Building className="h-4 w-4 text-primary" />
            Government Officials
          </h4>
          <div className="space-y-2">
            {govContacts.map((contact) => (
              <ContactCard key={contact._id} contact={contact} />
            ))}
          </div>
        </div>
      )}

      {commercialContacts.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Users className="h-4 w-4 text-primary" />
            Commercial Partners
          </h4>
          <div className="space-y-2">
            {commercialContacts.map((contact) => (
              <ContactCard key={contact._id} contact={contact} />
            ))}
          </div>
        </div>
      )}

      {contacts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No contacts found for {city}</p>
        </div>
      )}
    </div>
  );
}

function ContactCard({ contact }: { contact: any }) {
  return (
    <div className="p-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
      <h5 className="font-bold text-gray-900 dark:text-gray-100">{contact.name}</h5>
      <div className="flex items-center gap-1 mt-1">
        <Phone className="h-3 w-3 text-accent" />
        <span className="text-sm text-gray-600 dark:text-gray-300">{contact.phone}</span>
      </div>
      {contact.notes && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{contact.notes}</p>
      )}
    </div>
  );
}
