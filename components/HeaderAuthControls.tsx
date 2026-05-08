'use client';

import { GoogleAuthProvider, useGoogleAuth, useOptionalGoogleAuth } from '@/components/GoogleAuthProvider';

interface HeaderAuthControlsProps {
  mobile?: boolean;
  onDone?: () => void;
}

function HeaderAuthControlsView({ mobile = false, onDone }: HeaderAuthControlsProps) {
  const { user, signIn, signOut, loading: authLoading, restoring, ready: authReady } = useGoogleAuth();

  if (mobile) {
    if (user) {
      return (
        <>
          <span className="mobile-nav-user" style={restoring ? { opacity: 0.6 } : undefined}>{user.email}</span>
          {!restoring && (
            <button
              onClick={() => {
                signOut();
                onDone?.();
              }}
              className="mobile-nav-signout"
            >
              Sign Out
            </button>
          )}
        </>
      );
    }

    return (
      <button
        onClick={() => {
          void signIn().finally(() => onDone?.());
        }}
        disabled={authLoading || !authReady}
        className="mobile-nav-signin"
      >
        {authLoading ? 'Signing in...' : 'Sign In with Google'}
      </button>
    );
  }

  if (user) {
    return (
      <div className="header-user-menu">
        <span className="header-signed-in" title={user.email} style={restoring ? { opacity: 0.6 } : undefined}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          {user.email.split('@')[0]}
        </span>
        {!restoring && <button onClick={signOut} className="header-signout-btn">Sign Out</button>}
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        void signIn();
      }}
      disabled={authLoading || !authReady}
      className="header-signin-btn"
    >
      {authLoading ? 'Signing in...' : 'Sign In'}
    </button>
  );
}

export default function HeaderAuthControls(props: HeaderAuthControlsProps) {
  const auth = useOptionalGoogleAuth();

  if (auth) {
    return <HeaderAuthControlsView {...props} />;
  }

  return (
    <GoogleAuthProvider>
      <HeaderAuthControlsView {...props} />
    </GoogleAuthProvider>
  );
}