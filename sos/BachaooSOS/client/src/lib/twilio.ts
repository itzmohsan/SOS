// Twilio client-side utilities for emergency SMS functionality
// Note: Actual SMS sending happens server-side for security

export interface TwilioConfig {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
}

export interface SMSRequest {
  to: string;
  body: string;
  from?: string;
}

export interface SMSResponse {
  sid: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'delivered';
  to: string;
  from: string;
  body: string;
  errorCode?: number;
  errorMessage?: string;
}

/**
 * Client-side SMS service for emergency notifications
 * All actual SMS sending is handled server-side via Twilio API
 */
export class SMSService {
  private config: TwilioConfig;

  constructor(config: TwilioConfig = {}) {
    this.config = {
      accountSid: config.accountSid || import.meta.env.VITE_TWILIO_ACCOUNT_SID,
      authToken: config.authToken || import.meta.env.VITE_TWILIO_AUTH_TOKEN,
      phoneNumber: config.phoneNumber || import.meta.env.VITE_TWILIO_PHONE_NUMBER,
    };
  }

  /**
   * Send emergency SMS via backend API
   * This method calls the server-side SMS endpoint
   */
  async sendEmergencySMS(to: string, message: string): Promise<SMSResponse> {
    try {
      const response = await fetch('/api/notify/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: this.formatPhoneNumber(to),
          body: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send SMS');
      }

      return await response.json();
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSMS(recipients: string[], message: string): Promise<SMSResponse[]> {
    const promises = recipients.map(recipient => 
      this.sendEmergencySMS(recipient, message)
    );

    try {
      return await Promise.all(promises);
    } catch (error) {
      console.error('Bulk SMS sending failed:', error);
      throw error;
    }
  }

  /**
   * Format phone number for Twilio (E.164 format)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Pakistani numbers
    if (cleaned.startsWith('92')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+92${cleaned.slice(1)}`;
    } else if (cleaned.length === 10) {
      return `+92${cleaned}`;
    }
    
    // Assume it already has country code
    return `+${cleaned}`;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    // E.164 format validation (Pakistani numbers)
    return /^\+923[0-9]{9}$/.test(formatted);
  }

  /**
   * Get SMS delivery status (mock for client-side)
   */
  async getSMSStatus(messageSid: string): Promise<string> {
    try {
      const response = await fetch(`/api/notify/sms/${messageSid}/status`);
      if (!response.ok) {
        throw new Error('Failed to get SMS status');
      }
      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Failed to get SMS status:', error);
      return 'unknown';
    }
  }

  /**
   * Estimate SMS cost (mock implementation)
   */
  estimateSMSCost(recipients: number): number {
    // Twilio SMS cost estimation (approximate)
    const costPerSMS = 0.0075; // USD
    return recipients * costPerSMS;
  }

  /**
   * Check if Twilio is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.accountSid && this.config.authToken && this.config.phoneNumber);
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): {
    configured: boolean;
    missing: string[];
  } {
    const missing: string[] = [];
    
    if (!this.config.accountSid) missing.push('ACCOUNT_SID');
    if (!this.config.authToken) missing.push('AUTH_TOKEN');
    if (!this.config.phoneNumber) missing.push('PHONE_NUMBER');

    return {
      configured: missing.length === 0,
      missing,
    };
  }
}

// Emergency message templates
export const EmergencyMessageTemplates = {
  SOS_ALERT: (userName: string, location: string) => 
    `🚨 EMERGENCY ALERT: ${userName} has triggered an SOS alert near ${location}. Please check immediately or call authorities. - Bachaoo Network`,
    
  SOS_RESOLVED: (location: string) =>
    `✅ EMERGENCY RESOLVED: The emergency alert near ${location} has been resolved. Thank you for your concern. - Bachaoo Network`,
    
  RESPONDER_UPDATE: (responderCount: number, location: string) =>
    `📍 EMERGENCY UPDATE: ${responderCount} people are now responding to the emergency near ${location}. - Bachaoo Network`,
    
  LOW_RESPONDER_ALERT: (location: string) =>
    `🆘 URGENT: Emergency reported near ${location} needs more responders. If safe, please check or call 15. Reply STOP to opt-out. - Bachaoo Network`,
};

// Create default SMS service instance
export const smsService = new SMSService();

// Utility functions for SMS handling
export const SMSUtils = {
  /**
   * Create emergency contact message
   */
  createEmergencyContactMessage: (userName: string, location: string, userPhone: string) => {
    return `🚨 EMERGENCY: ${userName} (${userPhone}) has activated emergency alert. Location: ${location}. Please contact them immediately or call emergency services.`;
  },

  /**
   * Create helper notification message
   */
  createHelperNotificationMessage: (distance: string, location: string) => {
    return `🆘 HELP NEEDED: Emergency reported ${distance} from you near ${location}. If you can safely assist, please respond. Your help could save a life.`;
  },

  /**
   * Validate emergency contact format
   */
  validateEmergencyContact: (contact: { name: string; phone: string }) => {
    return {
      isValid: contact.name.length >= 2 && smsService.isValidPhoneNumber(contact.phone),
      errors: {
        name: contact.name.length < 2 ? 'Name must be at least 2 characters' : null,
        phone: !smsService.isValidPhoneNumber(contact.phone) ? 'Invalid phone number format' : null,
      }
    };
  },
};

export default smsService;
