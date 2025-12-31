import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

interface Installment {
  _id: string;
  dueDate: string;
  amount: number;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  paidAt?: number;
  failureReason?: string;
}

interface InstallmentTimelineProps {
  installments: Installment[];
}

export function InstallmentTimeline({ installments }: InstallmentTimelineProps) {
  const sortedInstallments = [...installments].sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-400" />;
      case "processing":
        return <Clock className="h-5 w-5 text-yellow-400 animate-pulse" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-400 bg-green-400/10 border-green-400/30";
      case "failed":
        return "text-red-400 bg-red-400/10 border-red-400/30";
      case "processing":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
      case "cancelled":
        return "text-gray-400 bg-gray-400/10 border-gray-400/30";
      default:
        return "text-gray-400 bg-white/5 border-white/10";
    }
  };

  if (installments.length === 0) {
    return (
      <div className="glass-card p-6">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
          <span className="w-1 h-6 bg-gradient-to-b from-brand-cyan to-brand-purple rounded-full"></span>
          Payment Timeline
        </h2>
        <p className="text-gray-500">No installments scheduled. This booking uses lump sum payment.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
        <span className="w-1 h-6 bg-gradient-to-b from-brand-cyan to-brand-purple rounded-full"></span>
        Payment Timeline
      </h2>
      
      <div className="space-y-4">
        {sortedInstallments.map((installment, index) => {
          const dueDate = new Date(installment.dueDate);
          const isOverdue = dueDate < new Date() && installment.status === "pending";
          
          return (
            <div key={installment._id} className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {getStatusIcon(installment.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      Payment #{index + 1}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Due: {dueDate.toLocaleDateString()}
                      {isOverdue && (
                        <span className="text-red-400 ml-2">(Overdue)</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-white font-medium">
                      ${installment.amount.toLocaleString()}
                    </p>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(installment.status)}`}>
                      {installment.status}
                    </div>
                  </div>
                </div>
                
                {installment.status === "paid" && installment.paidAt && (
                  <p className="text-green-400 text-sm mt-1">
                    Paid on {new Date(installment.paidAt).toLocaleDateString()}
                  </p>
                )}
                
                {installment.status === "failed" && installment.failureReason && (
                  <p className="text-red-400 text-sm mt-1">
                    Failed: {installment.failureReason}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
