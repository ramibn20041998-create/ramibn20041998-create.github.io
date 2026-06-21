const SANDBOX = import.meta.env.VITE_PI_SANDBOX === 'true';

function getPi() {
  if (typeof window === 'undefined' || !window.Pi) {
    throw new Error('Pi SDK not found. Open this app inside Pi Browser to use Pi features.');
  }
  return window.Pi;
}

let initialized = false;
export function initPi() {
  const Pi = getPi();
  if (!initialized) {
    Pi.init({ version: '2.0', sandbox: SANDBOX });
    initialized = true;
  }
  return Pi;
}

/**
 * Authenticates with Pi Network. `onIncompletePaymentFound` receives any
 * payment from a previous session that never finished, so it can be
 * forwarded to the backend's /payments/resolve-incomplete endpoint.
 */
export async function authenticateWithPi(onIncompletePaymentFound) {
  const Pi = initPi();
  const scopes = ['username', 'payments', 'wallet_address'];
  const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);
  return authResult; // { accessToken, user: { uid, username } }
}

/**
 * Creates a Pi payment for buying LAD. The three callbacks drive the
 * server-approval / server-completion handshake described in the Pi docs.
 */
export function createPiPayment({ amount, memo, metadata }, { onReadyForServerApproval, onReadyForServerCompletion, onCancel, onError }) {
  const Pi = initPi();
  Pi.createPayment(
    { amount, memo, metadata },
    {
      onReadyForServerApproval,
      onReadyForServerCompletion,
      onCancel,
      onError,
    }
  );
}

export function isPiBrowser() {
  return typeof window !== 'undefined' && !!window.Pi;
}
