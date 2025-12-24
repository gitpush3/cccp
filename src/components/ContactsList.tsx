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
            <div key={i} className="h-16 bg-white/10 rounded-xl"></div>
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
          <h4 className="text-xs font-bold text-white/60 mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Building className="h-3 w-3" />
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
          <h4 className="text-xs font-bold text-white/60 mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Users className="h-3 w-3" />
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
          <p className="text-white/60">No contacts found for {city}</p>
        </div>
      )}
    </div>
  );
}

function ContactCard({ contact }: { contact: any }) {
  return (
    <div className="p-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl transition-all shadow-sm group">
      <h5 className="font-bold text-white group-hover:text-accent transition-colors">{contact.name}</h5>
      <div className="flex items-center gap-2 mt-2">
        <Phone className="h-3 w-3 text-accent" />
        <span className="text-sm text-white/80 font-medium">{contact.phone}</span>
      </div>
      {contact.notes && (
        <p className="text-xs text-white/60 mt-2 italic border-t border-white/10 pt-2">{contact.notes}</p>
      )}
    </div>
  );
}
