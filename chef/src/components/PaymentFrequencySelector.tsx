import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface PaymentFrequencySelectorProps {
  bookingId: string;
  currentFrequency: string;
  remainingAmount: number;
  cutoffDate: string;
}

export function PaymentFrequencySelector({ 
  bookingId, 
  currentFrequency, 
  remainingAmount, 
  cutoffDate 
}: PaymentFrequencySelectorProps) {
  const [selectedFrequency, setSelectedFrequency] = useState(currentFrequency);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateFrequency = useMutation(api.bookings.updatePaymentFrequency);

  const frequencies = [
    { value: "weekly", label: "Weekly", description: "Pay every week" },
    { value: "bi-weekly", label: "Bi-weekly", description: "Pay every 2 weeks" },
    { value: "monthly", label: "Monthly", description: "Pay every month" },
    { value: "lump-sum", label: "Lump Sum", description: "Pay all at once" },
  ];

  const calculatePayments = (frequency: string) => {
    if (frequency === "lump-sum") return { count: 1, amount: remainingAmount };
    
    const cutoff = new Date(cutoffDate);
    const now = new Date();
    const weeksUntilCutoff = Math.floor((cutoff.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    let paymentCount: number;
    switch (frequency) {
      case "weekly":
        paymentCount = Math.max(1, weeksUntilCutoff);
        break;
      case "bi-weekly":
        paymentCount = Math.max(1, Math.floor(weeksUntilCutoff / 2));
        break;
      case "monthly":
        paymentCount = Math.max(1, Math.floor(weeksUntilCutoff / 4));
        break;
      default:
        paymentCount = 1;
    }
    
    return {
      count: paymentCount,
      amount: Math.ceil(remainingAmount / paymentCount)
    };
  };

  const handleUpdate = async () => {
    if (selectedFrequency === currentFrequency) return;
    
    setIsUpdating(true);
    try {
      await updateFrequency({
        bookingId: bookingId as any,
        newFrequency: selectedFrequency as any,
      });
      toast.success("Payment frequency updated successfully");
    } catch (error) {
      toast.error("Failed to update payment frequency");
      setSelectedFrequency(currentFrequency);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Payment Schedule</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {frequencies.map((freq) => {
          const payments = calculatePayments(freq.value);
          const isSelected = selectedFrequency === freq.value;
          
          return (
            <button
              key={freq.value}
              onClick={() => setSelectedFrequency(freq.value)}
              className={`p-5 rounded-xl border text-left transition-all duration-300 ${
                isSelected
                  ? "border-brand-cyan bg-brand-cyan/10 shadow-glow-cyan"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-white text-lg">{freq.label}</h4>
                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                  isSelected ? "border-brand-cyan bg-brand-cyan" : "border-gray-500"
                }`} />
              </div>
              <p className="text-gray-500 text-sm mb-3">{freq.description}</p>
              <div className="text-sm">
                <span className="text-white font-medium">
                  {payments.count} payment{payments.count > 1 ? 's' : ''} of <span className="text-brand-cyan">${payments.amount.toLocaleString()}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedFrequency !== currentFrequency && (
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={() => setSelectedFrequency(currentFrequency)}
            className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="btn-brand px-5 py-2.5 disabled:opacity-50"
          >
            {isUpdating ? "Updating..." : "Update Schedule"}
          </button>
        </div>
      )}
    </div>
  );
}
