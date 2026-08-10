import { Context, Result } from '@aitos/core';
import { BridgeAtom } from '../BridgeAtom';

class ImapFetchAtom extends BridgeAtom {
  name = 'imapFetch';
  version = '1.0.0';
  meta = {
    input: [
      { name: 'host', type: 'string', description: 'IMAP server hostname' },
      { name: 'port', type: 'number', description: 'IMAP server port (default 993)' },
      { name: 'secure', type: 'boolean', description: 'Use SSL/TLS connection', optional: true },
      { name: 'username', type: 'string', description: 'IMAP authentication username' },
      { name: 'password', type: 'string', description: 'IMAP authentication password' },
      { name: 'mailbox', type: 'string', description: 'Mailbox folder to fetch from (default INBOX)', optional: true },
      { name: 'limit', type: 'number', description: 'Maximum number of messages to fetch', optional: true },
      { name: 'includeBody', type: 'boolean', description: 'Include email body in results', optional: true },
    ],
    output: { type: 'array', description: '[{ id: string, from: string, subject: string, date: string, body?: string }]' }
  };

  async execute(input: {
    host: string;
    port: number;
    secure?: boolean;
    username: string;
    password: string;
    mailbox?: string;
    limit?: number;
    includeBody?: boolean;
  }, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Bridge not available. imapFetch requires native environment.'
      };
    }

    try {
      const result = await this.callBridge('imapFetch', {
        host: input.host,
        port: input.port,
        secure: input.secure ?? true,
        username: input.username,
        password: input.password,
        mailbox: input.mailbox ?? 'INBOX',
        limit: input.limit ?? 20,
        includeBody: input.includeBody ?? false,
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: `Failed to fetch emails: ${error}` };
    }
  }
}

export const imapFetchAtom = new ImapFetchAtom();