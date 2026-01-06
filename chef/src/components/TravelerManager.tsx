import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, User } from "lucide-react";

interface Traveler {
  _id: string;
  name: string;
  email: string;
  phone: string;
  passport?: string;
  dateOfBirth?: string;
}

interface TravelerManagerProps {
  bookingId: string;
  maxOccupancy: number;
  travelers: Traveler[];
}

export function TravelerManager({ bookingId, maxOccupancy, travelers }: TravelerManagerProps) {
  const [isAddingTraveler, setIsAddingTraveler] = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<string | null>(null);
  
  const addTraveler = useMutation(api.travelers.addTraveler);
  const updateTraveler = useMutation(api.travelers.updateTraveler);
  const deleteTraveler = useMutation(api.travelers.deleteTraveler);

  const handleAddTraveler = async (formData: FormData) => {
    try {
      await addTraveler({
        bookingId: bookingId as any,
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        passport: formData.get("passport") as string || undefined,
        dateOfBirth: formData.get("dateOfBirth") as string || undefined,
      });
      toast.success("Traveler added successfully");
      setIsAddingTraveler(false);
    } catch (error) {
      toast.error("Failed to add traveler");
    }
  };

  const handleUpdateTraveler = async (travelerId: string, formData: FormData) => {
    try {
      await updateTraveler({
        travelerId: travelerId as any,
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        passport: formData.get("passport") as string || undefined,
        dateOfBirth: formData.get("dateOfBirth") as string || undefined,
      });
      toast.success("Traveler updated successfully");
      setEditingTraveler(null);
    } catch (error) {
      toast.error("Failed to update traveler");
    }
  };

  const handleDeleteTraveler = async (travelerId: string) => {
    if (!confirm("Are you sure you want to remove this traveler?")) return;
    
    try {
      await deleteTraveler({ travelerId: travelerId as any });
      toast.success("Traveler removed successfully");
    } catch (error) {
      toast.error("Failed to remove traveler");
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
            <span className="w-1 h-6 bg-gradient-to-b from-brand-cyan to-brand-purple rounded-full"></span>
            Travelers
          </h2>
          <p className="text-gray-500 text-sm mt-1 ml-4">
            {travelers.length} of {maxOccupancy} travelers added
          </p>
        </div>
        
        {travelers.length < maxOccupancy && (
          <button
            onClick={() => setIsAddingTraveler(true)}
            className="btn-brand px-4 py-2.5 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Traveler</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {travelers.map((traveler) => (
          <div key={traveler._id} className="p-4 bg-white/5 rounded-xl border border-white/5">
            {editingTraveler === traveler._id ? (
              <TravelerForm
                traveler={traveler}
                onSubmit={(formData) => handleUpdateTraveler(traveler._id, formData)}
                onCancel={() => setEditingTraveler(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 rounded-xl bg-brand-purple/10">
                    <User className="h-6 w-6 text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{traveler.name}</h3>
                    <p className="text-gray-500 text-sm">{traveler.email}</p>
                    <p className="text-gray-500 text-sm">{traveler.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingTraveler(traveler._id)}
                    className="p-2.5 rounded-lg text-gray-400 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTraveler(traveler._id)}
                    className="p-2.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isAddingTraveler && (
          <div className="p-4 bg-white/5 rounded-xl border border-brand-cyan/20">
            <TravelerForm
              onSubmit={handleAddTraveler}
              onCancel={() => setIsAddingTraveler(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface TravelerFormProps {
  traveler?: Traveler;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}

function TravelerForm({ traveler, onSubmit, onCancel }: TravelerFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            defaultValue={traveler?.name}
            required
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all placeholder-gray-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Email *
          </label>
          <input
            type="email"
            name="email"
            defaultValue={traveler?.email}
            required
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all placeholder-gray-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Phone *
          </label>
          <input
            type="tel"
            name="phone"
            defaultValue={traveler?.phone}
            required
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all placeholder-gray-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Date of Birth
          </label>
          <input
            type="date"
            name="dateOfBirth"
            defaultValue={traveler?.dateOfBirth}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Passport Number
          </label>
          <input
            type="text"
            name="passport"
            defaultValue={traveler?.passport}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 outline-none transition-all placeholder-gray-500"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-brand px-5 py-2.5"
        >
          {traveler ? "Update" : "Add"} Traveler
        </button>
      </div>
    </form>
  );
}
