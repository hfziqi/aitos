import { Context, Result } from '@aitos/core';
import { BridgeAtom } from '../BridgeAtom';

class SmtpSendAtom extends BridgeAtom {
  name = 'smtpSend';
  version = '1.0.0';
  meta = {
    input: [
      { name: 'host', type: 'string', description: 'SMTP server hostname' },
      { name: 'port', type: 'number', description: 'SMTP server port (465 for SSL, 587 for TLS)' },
      { name: 'secure', type: 'boolean', description: 'Use SSL/TLS connection', optional: true },
      { name: 'username', type: 'string', description: 'SMTP authentication username' },
      { name: 'password', type: 'string', description: 'SMTP authentication password' },
      { name: 'from', type: 'string', description: 'Sender email address' },
      { name: 'to', type: 'string', description: 'Recipient email address(es), comma separated' },
      { name: 'subject', type: 'string', description: 'Email subject' },
      { name: 'body', type: 'string', description: 'Email body content (plain text or HTML)' },
      { name: 'cc', type: 'string', description: 'CC recipient(s), comma separated', optional: true },
      { name: 'bcc', type: 'string', description: 'BCC recipient(s), comma separated', optional: true },
    ],
    output: { type: 'object', description: '{ success: boolean, messageId: string }' }
  };

  async execute(input: {
    host: string;
    port: number;
    secure?: boolean;
    username: string;
    password: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
  }, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Bridge not available. smtpSend requires native environment.'
      };
    }

    try {
      const result = await this.callBridge('smtpSend', {
        host: input.host,
        port: input.port,
        secure: input.secure ?? input.port === 465,
        username: input.username,
        password: input.password,
        from: input.from,
        to: input.to,
        subject: input.subject,
        body: input.body,
        cc: input.cc,
        bcc: input.bcc,
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: `Failed to send email: ${error}` };
    }
  }
}

export const smtpSendAtom = new SmtpSendAtom();