import { Account, Client, ExecutionMethod, Functions, ID } from 'appwrite';

import { assertDeletionAccepted, normalizeEmail, readDeletionChallenge, serializeDeletionChallenge, validateOtpCode } from './deletion-flow';
import './style.css';

const configuration = {
  operatorName: import.meta.env.VITE_OPERATOR_NAME as string,
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL as string,
  mailingAddress: import.meta.env.VITE_MAILING_ADDRESS as string,
  effectiveDate: import.meta.env.VITE_EFFECTIVE_DATE as string,
  backupRetentionDays: (import.meta.env.VITE_BACKUP_RETENTION_DAYS as string) || '30',
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT as string,
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID as string,
  functionId: (import.meta.env.VITE_APPWRITE_API_FUNCTION_ID as string) || 'diary-api',
};

function fill(selector: string, value: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => { element.textContent = value; });
}

fill('[data-operator]', configuration.operatorName);
fill('[data-support-email]', configuration.supportEmail);
fill('[data-mailing-address]', configuration.mailingAddress);
fill('[data-effective-date]', configuration.effectiveDate);
fill('[data-backup-days]', configuration.backupRetentionDays);
document.querySelectorAll<HTMLAnchorElement>('[data-support-link]').forEach((link) => { link.href = `mailto:${configuration.supportEmail}`; });

const client = new Client().setEndpoint(configuration.endpoint).setProject(configuration.projectId);
const account = new Account(client);
const email = document.querySelector<HTMLInputElement>('#email')!;
const code = document.querySelector<HTMLInputElement>('#code')!;
const confirmationText = document.querySelector<HTMLInputElement>('#confirmation-text')!;
const verification = document.querySelector<HTMLElement>('#verification')!;
const confirmation = document.querySelector<HTMLElement>('#confirmation')!;
const status = document.querySelector<HTMLElement>('#status')!;
const challengeKey = 'diary-ai:legal-delete-challenge';

function message(value: string, failed = false) {
  status.textContent = value;
  status.dataset.failed = String(failed);
}

function normalizedEmail() {
  return normalizeEmail(email.value);
}

document.querySelector<HTMLButtonElement>('#send-code')!.addEventListener('click', async () => {
  try {
    const address = normalizedEmail();
    if (!address || !email.checkValidity()) throw new Error('Enter the Email OTP address used by your Diary AI account.');
    message('Sending a verification code…');
    const token = await account.createEmailToken({ userId: ID.unique(), email: address, phrase: true });
    sessionStorage.setItem(challengeKey, serializeDeletionChallenge(token.userId, address));
    email.readOnly = true;
    verification.hidden = false;
    message('Check your inbox for the six-digit verification code.');
    code.focus();
  } catch (error) {
    message(error instanceof Error ? error.message : 'The verification code could not be sent.', true);
  }
});

document.querySelector<HTMLButtonElement>('#verify-code')!.addEventListener('click', async () => {
  try {
    const challenge = readDeletionChallenge(sessionStorage.getItem(challengeKey), normalizedEmail());
    const secret = validateOtpCode(code.value);
    message('Verifying…');
    await account.createSession({ userId: challenge.userId, secret });
    sessionStorage.removeItem(challengeKey);
    confirmation.hidden = false;
    verification.hidden = true;
    message('Identity verified. Type DELETE to enable the final deletion button.');
    confirmationText.focus();
  } catch (error) {
    message(error instanceof Error ? error.message : 'The verification code could not be verified.', true);
  }
});

document.querySelector<HTMLButtonElement>('#delete-account')!.addEventListener('click', async () => {
  try {
    if (confirmationText.value !== 'DELETE') throw new Error('Type DELETE exactly before continuing.');
    message('Disabling access and queuing deletion…');
    const jwt = await account.createJWT({ duration: 900 });
    const authenticatedClient = new Client().setEndpoint(configuration.endpoint).setProject(configuration.projectId).setJWT(jwt.jwt);
    const execution = await new Functions(authenticatedClient).createExecution({
      functionId: configuration.functionId,
      body: '',
      async: false,
      xpath: '/account',
      method: ExecutionMethod.DELETE,
      headers: { 'content-type': 'application/json', 'x-appwrite-user-jwt': jwt.jwt, 'x-diary-app-version': '1.0.0' },
    });
    assertDeletionAccepted(execution.responseStatusCode, execution.responseBody);
    await account.deleteSession({ sessionId: 'current' }).catch(() => undefined);
    email.disabled = true;
    confirmationText.disabled = true;
    document.querySelector<HTMLButtonElement>('#delete-account')!.disabled = true;
    message('Deletion accepted. Access is disabled and provider cleanup is now queued.');
  } catch (error) {
    message(error instanceof Error ? error.message : 'The deletion request could not be completed.', true);
  }
});
