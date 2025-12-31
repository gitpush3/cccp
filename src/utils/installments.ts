import { 
  addWeeks, 
  addMonths, 
  differenceInDays, 
  subDays, 
  isBefore, 
  startOfDay 
} from 'date-fns';
import { BookingData, Installment, PaymentSchedule, PaymentFrequency } from '../types';

export function calculatePayoffDate(travelDate: Date): Date {
  return subDays(startOfDay(travelDate), 60);
}

export function calculateInstallments(data: BookingData): PaymentSchedule {
  const payoffDate = calculatePayoffDate(data.travelDate);
  const totalRemaining = data.totalAmount - data.depositAmount;
  
  if (totalRemaining <= 0) {
    return { payoffDate, installments: [], totalRemaining: 0 };
  }

  if (data.frequency === 'lump-sum' || isBefore(payoffDate, data.bookingDate)) {
    return {
      payoffDate,
      totalRemaining,
      installments: [{
        dueDate: payoffDate,
        amount: totalRemaining,
        status: 'pending'
      }]
    };
  }

  const installments: Installment[] = [];
  let nextDate = getNextPaymentDate(data.bookingDate, data.frequency);

  // While next installment date is before or on payoff date
  while (isBefore(nextDate, payoffDate) || nextDate.getTime() === payoffDate.getTime()) {
    installments.push({
      dueDate: nextDate,
      amount: 0, // Will calculate below
      status: 'pending'
    });
    nextDate = getNextPaymentDate(nextDate, data.frequency);
  }

  // If no installments could be scheduled before payoff date, default to lump sum at payoff
  if (installments.length === 0) {
    return {
      payoffDate,
      totalRemaining,
      installments: [{
        dueDate: payoffDate,
        amount: totalRemaining,
        status: 'pending'
      }]
    };
  }

  // Calculate equal amounts
  const equalAmount = Math.floor((totalRemaining / installments.length) * 100) / 100;
  const lastAmount = totalRemaining - (equalAmount * (installments.length - 1));

  for (let i = 0; i < installments.length; i++) {
    installments[i].amount = i === installments.length - 1 ? lastAmount : equalAmount;
  }

  return {
    payoffDate,
    totalRemaining,
    installments
  };
}

function getNextPaymentDate(currentDate: Date, frequency: PaymentFrequency): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'bi-weekly':
      return addWeeks(currentDate, 2);
    case 'monthly':
      return addMonths(currentDate, 1);
    default:
      return currentDate;
  }
}
