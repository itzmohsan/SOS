// SMS utility functions for client-side SMS handling
// Note: Actual SMS sending is handled on the server-side via Twilio

export interface SMSMessage {
  to: string;
  message: string;
}

export interface SMSNotification {
  type: 'emergency' | 'resolved' | 'response';
  location?: string;
  userName?: string;
  distance?: number;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove country code for display if present
  const cleaned = phone.replace(/^\+92/, '');
  
  // Format as XXX XXXXXXX
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  
  return phone;
}

/**
 * Validate Pakistani phone number
 */
export function validatePakistaniPhone(phone: string): boolean {
  // Remove spaces and country code
  const cleaned = phone.replace(/[\s\-\+]/g, '').replace(/^92/, '');
  
  // Check if it's a valid Pakistani mobile number (starts with 3)
  return /^3[0-9]{9}$/.test(cleaned);
}

/**
 * Format phone number for API calls
 */
export function formatPhoneForAPI(phone: string): string {
  let cleaned = phone.replace(/[\s\-]/g, '');
  
  // Add country code if not present
  if (!cleaned.startsWith('+92')) {
    if (cleaned.startsWith('92')) {
      cleaned = `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      cleaned = `+92${cleaned.slice(1)}`;
    } else {
      cleaned = `+92${cleaned}`;
    }
  }
  
  return cleaned;
}

/**
 * Generate emergency SMS message
 */
export function generateEmergencyMessage(notification: SMSNotification): string {
  switch (notification.type) {
    case 'emergency':
      return `EMERGENCY ALERT: ${notification.userName || 'Someone'} has triggered an SOS alert${notification.location ? ` near ${notification.location}` : ''}. Please check immediately or call authorities. Reply STOP to opt-out.`;
    
    case 'resolved':
      return `EMERGENCY UPDATE: The emergency alert${notification.location ? ` near ${notification.location}` : ''} has been resolved. Thank you for your concern.`;
    
    case 'response':
      return `EMERGENCY UPDATE: Someone is responding to the emergency${notification.location ? ` near ${notification.location}` : ''}${notification.distance ? ` (${notification.distance.toFixed(1)}km away)` : ''}.`;
    
    default:
      return 'Emergency notification from Bachaoo Safety Network.';
  }
}

/**
 * Check if phone number is opted out (placeholder for future implementation)
 */
export function isPhoneOptedOut(phone: string): boolean {
  // This would check against a server-side opt-out list
  // For now, always return false
  return false;
}

/**
 * Get emergency contact names for display
 */
export function getContactDisplayNames(contacts: Array<{name: string; phone: string}>): string {
  if (contacts.length === 0) return 'No contacts';
  if (contacts.length === 1) return contacts[0].name;
  if (contacts.length === 2) return `${contacts[0].name} & ${contacts[1].name}`;
  return `${contacts[0].name} & ${contacts.length - 1} others`;
}

/**
 * Estimate SMS delivery time (mock function)
 */
export function estimateSMSDeliveryTime(): number {
  // Return estimated delivery time in seconds
  return Math.random() * 10 + 5; // 5-15 seconds
}
