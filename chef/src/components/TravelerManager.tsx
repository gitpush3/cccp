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
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Travelers</h2>
          <p className="text-gray-400 text-sm">
            {travelers.length} of {maxOccupancy} travelers added
          </p>
        </div>
        
        {travelers.length < maxOccupancy && (
          <button
            onClick={() => setIsAddingTraveler(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Add Traveler</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {travelers.map((traveler) => (
          <div key={traveler._id} className="p-4 bg-gray-700/30 rounded-lg">
            {editingTraveler === traveler._id ? (
              <TravelerForm
                traveler={traveler}
                onSubmit={(formData) => handleUpdateTraveler(traveler._id, formData)}
                onCancel={() => setEditingTraveler(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="h-8 w-8 text-gray-400" />
                  <div>
                    <h3 className="text-white font-medium">{traveler.name}</h3>
                    <p className="text-gray-400 text-sm">{traveler.email}</p>
                    <p className="text-gray-400 text-sm">{traveler.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingTraveler(traveler._id)}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTraveler(traveler._id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isAddingTraveler && (
          <div className="p-4 bg-gray-700/30 rounded-lg">
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
            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
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
            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
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
            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
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
            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
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
            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
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
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-200"
        >
          {traveler ? "Update" : "Add"} Traveler
        </button>
      </div>
    </form>
  );
}
