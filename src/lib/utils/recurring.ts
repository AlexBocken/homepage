import type { IRecurringPayment } from '$models/RecurringPayment';

export interface CronJobFields {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export function parseCronExpression(cronExpression: string): CronJobFields | null {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }
  
  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4]
  };
}

export function validateCronExpression(cronExpression: string): boolean {
  const fields = parseCronExpression(cronExpression);
  if (!fields) return false;
  
  // Basic validation for cron fields
  const validations = [
    { field: fields.minute, min: 0, max: 59 },
    { field: fields.hour, min: 0, max: 23 },
    { field: fields.dayOfMonth, min: 1, max: 31 },
    { field: fields.month, min: 1, max: 12 },
    { field: fields.dayOfWeek, min: 0, max: 7 }
  ];
  
  for (const validation of validations) {
    if (!isValidCronField(validation.field, validation.min, validation.max)) {
      return false;
    }
  }
  
  return true;
}

function isValidCronField(field: string, min: number, max: number): boolean {
  if (field === '*') return true;
  
  // Handle ranges (e.g., "1-5")
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
  }
  
  // Handle step values (e.g., "*/5", "1-10/2")
  if (field.includes('/')) {
    const [range, step] = field.split('/');
    const stepNum = Number(step);
    if (isNaN(stepNum) || stepNum <= 0) return false;
    
    if (range === '*') return true;
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
    }
    const num = Number(range);
    return !isNaN(num) && num >= min && num <= max;
  }
  
  // Handle comma-separated values (e.g., "1,3,5")
  if (field.includes(',')) {
    const values = field.split(',').map(Number);
    return values.every(val => !isNaN(val) && val >= min && val <= max);
  }
  
  // Handle single number
  const num = Number(field);
  return !isNaN(num) && num >= min && num <= max;
}

export function calculateNextExecutionDate(
  recurringPayment: IRecurringPayment,
  fromDate: Date = new Date()
): Date {
  const baseDate = new Date(fromDate);
  
  switch (recurringPayment.frequency) {
    case 'daily':
      baseDate.setDate(baseDate.getDate() + 1);
      break;
      
    case 'weekly':
      baseDate.setDate(baseDate.getDate() + 7);
      break;
      
    case 'monthly':
      baseDate.setMonth(baseDate.getMonth() + 1);
      break;
      
    case 'custom':
      if (!recurringPayment.cronExpression) {
        throw new Error('Cron expression required for custom frequency');
      }
      return calculateNextCronDate(recurringPayment.cronExpression, baseDate);
      
    default:
      throw new Error('Invalid frequency');
  }
  
  return baseDate;
}

export function calculateNextCronDate(cronExpression: string, fromDate: Date): Date {
  const fields = parseCronExpression(cronExpression);
  if (!fields) {
    throw new Error('Invalid cron expression');
  }
  
  const next = new Date(fromDate);
  next.setSeconds(0);
  next.setMilliseconds(0);
  
  // Start from the next minute
  next.setMinutes(next.getMinutes() + 1);
  
  // Find the next valid date
  for (let attempts = 0; attempts < 366; attempts++) { // Prevent infinite loops
    if (matchesCronFields(next, fields)) {
      return next;
    }
    next.setMinutes(next.getMinutes() + 1);
  }
  
  throw new Error('Unable to find next execution date within reasonable range');
}

function matchesCronFields(date: Date, fields: CronJobFields): boolean {
  return (
    matchesCronField(date.getMinutes(), fields.minute, 0, 59) &&
    matchesCronField(date.getHours(), fields.hour, 0, 23) &&
    matchesCronField(date.getDate(), fields.dayOfMonth, 1, 31) &&
    matchesCronField(date.getMonth() + 1, fields.month, 1, 12) &&
    matchesCronField(date.getDay(), fields.dayOfWeek, 0, 7)
  );
}

function matchesCronField(value: number, field: string, min: number, max: number): boolean {
  if (field === '*') return true;
  
  // Handle ranges (e.g., "1-5")
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    return value >= start && value <= end;
  }
  
  // Handle step values (e.g., "*/5", "1-10/2")
  if (field.includes('/')) {
    const [range, step] = field.split('/');
    const stepNum = Number(step);
    
    if (range === '*') {
      return (value - min) % stepNum === 0;
    }
    
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      return value >= start && value <= end && (value - start) % stepNum === 0;
    }
    
    const rangeStart = Number(range);
    return value >= rangeStart && (value - rangeStart) % stepNum === 0;
  }
  
  // Handle comma-separated values (e.g., "1,3,5")
  if (field.includes(',')) {
    const values = field.split(',').map(Number);
    return values.includes(value);
  }
  
  // Handle single number
  return value === Number(field);
}

export function getFrequencyDescription(recurringPayment: IRecurringPayment): string {
  switch (recurringPayment.frequency) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return 'Every week';
    case 'monthly':
      return 'Every month';
    case 'custom':
      return `Custom: ${recurringPayment.cronExpression}`;
    default:
      return 'Unknown frequency';
  }
}

export function formatNextExecution(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else if (diffDays === 1) {
    return `Tomorrow at ${date.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else if (diffDays < 7) {
    return `In ${diffDays} days at ${date.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else {
    return date.toLocaleString('de-CH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}