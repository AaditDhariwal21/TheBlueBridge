import { useState } from 'react';

import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../lib/cn';
import { copyText } from '../../../lib/clipboard';
import { formatReferralCode } from '../../auth/validation';

/** The member's own referral code, with a button that copies it for sharing. */
export function ReferralCodeCard({ code }: { code: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const shown = formatReferralCode(code);

  const copy = async () => {
    if (await copyText(shown)) {
      setCopied(true);
      toast.success('Referral code copied. Share it with the woman you’re inviting.');
      window.setTimeout(() => {
        setCopied(false);
      }, 2_000);
    } else {
      toast.error('Couldn’t copy the code. Select it and copy it yourself.');
    }
  };

  return (
    <section aria-labelledby="referral-code-title" className="border border-border p-4">
      <h2 id="referral-code-title" className="font-sans text-sm text-text-muted">
        Your referral code
      </h2>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="font-display text-h3 tracking-caps select-all">{shown}</p>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy referral code ${shown}`}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 border px-3 text-sm transition-colors',
            copied
              ? 'border-success text-success'
              : 'border-border-strong text-text hover:border-text',
          )}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
            {copied ? (
              <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="1.75" />
            ) : (
              <>
                <rect x="8" y="8" width="12" height="12" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16 8V4H4v12h4" stroke="currentColor" strokeWidth="1.5" />
              </>
            )}
          </svg>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Share it with women you’d like to invite. It works while your account is active.
      </p>
    </section>
  );
}
