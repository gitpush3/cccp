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
      <h3 className="text-lg font-medium text-white">Payment Schedule</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {frequencies.map((freq) => {
          const payments = calculatePayments(freq.value);
          const isSelected = selectedFrequency === freq.value;
          
          return (
            <button
              key={freq.value}
              onClick={() => setSelectedFrequency(freq.value)}
              className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                isSelected
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-gray-600 bg-gray-700/30 hover:border-gray-500"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-white">{freq.label}</h4>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  isSelected ? "border-cyan-400 bg-cyan-400" : "border-gray-400"
                }`} />
              </div>
              <p className="text-gray-400 text-sm mb-2">{freq.description}</p>
              <div className="text-sm">
                <span className="text-white font-medium">
                  {payments.count} payment{payments.count > 1 ? 's' : ''} of ${payments.amount.toLocaleString()}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedFrequency !== currentFrequency && (
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setSelectedFrequency(currentFrequency)}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50"
          >
            {isUpdating ? "Updating..." : "Update Schedule"}
          </button>
        </div>
      )}
    </div>
  );
}
