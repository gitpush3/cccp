export type PaymentFrequency = 'weekly' | 'bi-weekly' | 'monthly' | 'lump-sum';

export interface BookingData {
  totalAmount: number;
  depositAmount: number;
  travelDate: Date;
  bookingDate: Date;
  frequency: PaymentFrequency;
  customerEmail: string;
}

export interface Installment {
  dueDate: Date;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'overdue';
}

export interface PaymentSchedule {
  payoffDate: Date;
  installments: Installment[];
  totalRemaining: number;
}
