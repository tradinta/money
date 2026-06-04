"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet, 
  PiggyBank, 
  Send, 
  Clock, 
  Compass, 
  ShieldCheck, 
  AlertTriangle, 
  User, 
  RefreshCw, 
  LogOut, 
  Check, 
  X, 
  TrendingUp, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  DollarSign,
  Activity,
  Layers,
  ChevronRight,
  Info,
  Search
} from 'lucide-react';
import { signIn, signUp, signOut } from '@/lib/auth-client';

export default function Home() {
  // Auth state
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'wallet' | 'savings' | 'requests' | 'coins' | 'admin' | 'explorer'>('wallet');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeCoins, setActiveCoins] = useState<any[]>([]);
  const [spentCoins, setSpentCoins] = useState<any[]>([]);
  const [selectedCoinLineage, setSelectedCoinLineage] = useState<any[] | null>(null);
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  
  // Requests state
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  
  // Admin dashboard state
  const [adminMetrics, setAdminMetrics] = useState<any>(null);
  const [adminOverdraftRequests, setAdminOverdraftRequests] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  // Form inputs
  const [transferUser, setTransferUser] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [requestUser, setRequestUser] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestDesc, setRequestDesc] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  const [savingsAmount, setSavingsAmount] = useState('');
  const [savingsAction, setSavingsAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [savingsError, setSavingsError] = useState('');
  const [savingsSuccess, setSavingsSuccess] = useState('');

  const [overdraftAmount, setOverdraftAmount] = useState('');
  const [overdraftReason, setOverdraftReason] = useState('');
  const [overdraftError, setOverdraftError] = useState('');
  const [overdraftSuccess, setOverdraftSuccess] = useState('');
  const [myOverdraftRequests, setMyOverdraftRequests] = useState<any[]>([]);

  const [mintAmount, setMintAmount] = useState('');
  const [mintError, setMintError] = useState('');
  const [mintSuccess, setMintSuccess] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const [depositUser, setDepositUser] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');
  const [isAdminDepositing, setIsAdminDepositing] = useState(false);

  // Admin Deduct & Burn states
  const [deductUser, setDeductUser] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductError, setDeductError] = useState('');
  const [deductSuccess, setDeductSuccess] = useState('');
  const [isDeducting, setIsDeducting] = useState(false);

  const [burnAmount, setBurnAmount] = useState('');
  const [burnError, setBurnError] = useState('');
  const [burnSuccess, setBurnSuccess] = useState('');
  const [isBurning, setIsBurning] = useState(false);

  // Explorer states
  const [explorerSearchQuery, setExplorerSearchQuery] = useState('');
  const [explorerResult, setExplorerResult] = useState<any>(null);
  const [explorerError, setExplorerError] = useState('');
  const [isExplorerSearching, setIsExplorerSearching] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  // Loaders and specific error states
  const [isSavingsLoading, setIsSavingsLoading] = useState(false);
  const [isSimulatingInterest, setIsSimulatingInterest] = useState(false);
  const [isIssuingRequest, setIsIssuingRequest] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [processingRequests, setProcessingRequests] = useState<Record<string, boolean>>({});
  const [coinLineageError, setCoinLineageError] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch current user details & system status
  const checkSession = async () => {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        setSession(data.session);
        setNewUsername(data.user.username);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user assets, logs, requests
  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // 1. Transactions
      const txRes = await fetch('/api/transactions');
      const txData = await txRes.json();
      if (txData.transactions) setTransactions(txData.transactions);

      // 2. Coin assets
      const coinsRes = await fetch('/api/coins');
      const coinsData = await coinsRes.json();
      if (coinsData.active) setActiveCoins(coinsData.active);
      if (coinsData.spent) setSpentCoins(coinsData.spent);

      // 3. Money requests
      const reqRes = await fetch('/api/requests');
      const reqData = await reqRes.json();
      if (reqData.sent) setSentRequests(reqData.sent);
      if (reqData.received) setReceivedRequests(reqData.received);

      // 4. My overdraft requests
      const odRes = await fetch('/api/overdraft');
      const odData = await odRes.json();
      if (odData.requests) setMyOverdraftRequests(odData.requests);

      // 5. Admin data (if user is admin)
      if (user.role === 'admin') {
        const adminRes = await fetch('/api/admin/dashboard');
        const adminData = await adminRes.json();
        if (adminData.metrics) setAdminMetrics(adminData.metrics);
        if (adminData.overdraftRequests) setAdminOverdraftRequests(adminData.overdraftRequests);
        if (adminData.auditLogs) setAdminLogs(adminData.auditLogs);
        if (adminData.users) setAdminUsers(adminData.users);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Keep track of the latest user balance using a ref to prevent stale closure loop toasts
  const lastBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (user) {
      lastBalanceRef.current = parseFloat(user.balance);
    }
  }, [user?.balance]);

  // Poll for real-time updates every 5 seconds
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      const interval = setInterval(() => {
        // Silently reload user details to get updated balance
        fetch('/api/me')
          .then(res => res.json())
          .then(data => {
            if (data.authenticated) {
              const newBalance = parseFloat(data.user.balance);
              // If balance changed, trigger toast!
              if (lastBalanceRef.current !== null && newBalance !== lastBalanceRef.current) {
                const diff = newBalance - lastBalanceRef.current;
                if (diff > 0) {
                  triggerToast(`Received +$${diff.toFixed(2)} in real time!`);
                } else {
                  triggerToast(`Debited $${Math.abs(diff).toFixed(2)} from your wallet.`);
                }
                lastBalanceRef.current = newBalance;
              }
              setUser(data.user);
            }
          });
        fetchDashboardData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Auth operations
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!email || !password || !name) {
      setAuthError('Please fill in all fields.');
      return;
    }

    try {
      const response = await signUp.email({
        email,
        password,
        name,
        callbackURL: '/'
      });

      if (response?.error) {
        setAuthError(response.error.message || 'Registration failed');
      } else {
        setAuthSuccess('Account created successfully! Logging in...');
        // Small delay to trigger session fetch
        setTimeout(async () => {
          await checkSession();
        }, 1500);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!email || !password) {
      setAuthError('Please enter email and password.');
      return;
    }

    try {
      const response = await signIn.email({
        email,
        password,
        callbackURL: '/'
      });

      if (response?.error) {
        setAuthError(response.error.message || 'Login failed');
      } else {
        setAuthSuccess('Logged in successfully!');
        setTimeout(async () => {
          await checkSession();
        }, 1000);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setSession(null);
    triggerToast('Logged out successfully.');
  };

  // Financial actions
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');
    setIsSending(true);

    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: transferUser, amount: transferAmount })
      });
      const data = await res.json();
      if (data.error) {
        setTransferError(data.error);
      } else {
        setTransferSuccess(`Successfully sent $${parseFloat(transferAmount).toFixed(2)} to ${transferUser}! (Fee: $${data.fee.toFixed(2)})`);
        setTransferUser('');
        setTransferAmount('');
        triggerToast('Transfer completed successfully!');
        checkSession();
        fetchDashboardData();
      }
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed');
    } finally {
      setIsSending(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');
    setIsIssuingRequest(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: requestUser, amount: requestAmount, description: requestDesc })
      });
      const data = await res.json();
      if (data.error) {
        setRequestError(data.error);
      } else {
        setRequestSuccess(`Request of $${parseFloat(requestAmount).toFixed(2)} sent to ${requestUser}.`);
        setRequestUser('');
        setRequestAmount('');
        setRequestDesc('');
        fetchDashboardData();
      }
    } catch (err: any) {
      setRequestError(err.message || 'Request failed');
    } finally {
      setIsIssuingRequest(false);
    }
  };

  const handleRequestAction = async (id: string, action: 'approve' | 'decline') => {
    setProcessingRequests(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/requests/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.error) {
        triggerToast(`Action failed: ${data.error}`);
      } else {
        triggerToast(`Money request ${action}d!`);
        checkSession();
        fetchDashboardData();
      }
    } catch (err: any) {
      triggerToast(`Error: ${err.message}`);
    } finally {
      setProcessingRequests(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSavingsActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingsError('');
    setSavingsSuccess('');
    setIsSavingsLoading(true);

    try {
      const res = await fetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: savingsAction, amount: savingsAmount })
      });
      const data = await res.json();
      if (data.error) {
        setSavingsError(data.error);
      } else {
        setSavingsSuccess(`Successfully ${savingsAction === 'deposit' ? 'saved' : 'withdrew'} $${parseFloat(savingsAmount).toFixed(2)}!`);
        setSavingsAmount('');
        checkSession();
        fetchDashboardData();
      }
    } catch (err: any) {
      setSavingsError(err.message || 'Action failed');
    } finally {
      setIsSavingsLoading(false);
    }
  };

  const triggerInterestSimulation = async () => {
    setSavingsError('');
    setSavingsSuccess('');
    setIsSimulatingInterest(true);
    try {
      const res = await fetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate_interest' })
      });
      const data = await res.json();
      if (data.error) {
        setSavingsError(data.error);
      } else {
        setSavingsSuccess(`Interest accrued! Your savings grew by +$${data.interestEarned.toFixed(2)} (5% simulated rate).`);
        triggerToast('Interest simulated!');
        checkSession();
        fetchDashboardData();
      }
    } catch (err: any) {
      setSavingsError(err.message || 'Action failed');
    } finally {
      setIsSimulatingInterest(false);
    }
  };

  const handleOverdraftRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverdraftError('');
    setOverdraftSuccess('');

    try {
      const res = await fetch('/api/overdraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedAmount: overdraftAmount, reason: overdraftReason })
      });
      const data = await res.json();
      if (data.error) {
        setOverdraftError(data.error);
      } else {
        setOverdraftSuccess(`Request for $${parseFloat(overdraftAmount).toFixed(2)} limit submitted to admins.`);
        setOverdraftAmount('');
        setOverdraftReason('');
        fetchDashboardData();
      }
    } catch (err: any) {
      setOverdraftError(err.message || 'Request failed');
    }
  };

  // Coin lineage pedigree tracker
  const fetchCoinLineage = async (coinId: string) => {
    setSelectedCoinId(coinId);
    setSelectedCoinLineage(null);
    setCoinLineageError(null);
    try {
      const res = await fetch(`/api/coins?coinId=${coinId}`);
      const data = await res.json();
      if (data.error) {
        setCoinLineageError(data.error);
      } else if (data.lineage) {
        setSelectedCoinLineage(data.lineage);
      } else {
        setCoinLineageError('No lineage tree found for this coin block.');
      }
    } catch (e: any) {
      console.error(e);
      setCoinLineageError(e.message || 'Failed to fetch coin lineage.');
    }
  };

  // Admin operations
  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setMintError('');
    setMintSuccess('');
    setIsMinting(true);
    try {
      const res = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: mintAmount })
      });
      const data = await res.json();
      if (data.error) {
        setMintError(data.error);
      } else {
        setMintSuccess(`Successfully minted ${parseFloat(mintAmount).toFixed(2)} coins. Serial: ${data.serial}`);
        setMintAmount('');
        triggerToast('New supply minted!');
        checkSession();
        fetchDashboardData();
      }
    } catch (e: any) {
      setMintError(e.message || 'Mint failed');
    } finally {
      setIsMinting(false);
    }
  };

  const handleAdminDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError('');
    setDepositSuccess('');
    setIsAdminDepositing(true);
    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: depositUser, amount: depositAmount })
      });
      const data = await res.json();
      if (data.error) {
        setDepositError(data.error);
      } else {
        setDepositSuccess(`Successfully deposited $${parseFloat(depositAmount).toFixed(2)} to ${depositUser}!`);
        setDepositUser('');
        setDepositAmount('');
        triggerToast('Deposit processed.');
        checkSession();
        fetchDashboardData();
      }
    } catch (e: any) {
      setDepositError(e.message || 'Deposit failed');
    } finally {
      setIsAdminDepositing(false);
    }
  };

  const handleAdminDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeductError('');
    setDeductSuccess('');
    setIsDeducting(true);
    try {
      const res = await fetch('/api/admin/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: deductUser, amount: deductAmount })
      });
      const data = await res.json();
      if (data.error) {
        setDeductError(data.error);
      } else {
        setDeductSuccess(`Successfully deducted $${parseFloat(deductAmount).toFixed(2)} from ${deductUser}!`);
        setDeductUser('');
        setDeductAmount('');
        triggerToast('Deduction completed.');
        checkSession();
        fetchDashboardData();
      }
    } catch (e: any) {
      setDeductError(e.message || 'Deduction failed');
    } finally {
      setIsDeducting(false);
    }
  };

  const handleAdminBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBurnError('');
    setBurnSuccess('');
    setIsBurning(true);
    try {
      const res = await fetch('/api/admin/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: burnAmount })
      });
      const data = await res.json();
      if (data.error) {
        setBurnError(data.error);
      } else {
        setBurnSuccess(`Successfully burned $${parseFloat(burnAmount).toFixed(2)} coins from the reserve!`);
        setBurnAmount('');
        triggerToast('Reserve supply burned.');
        checkSession();
        fetchDashboardData();
      }
    } catch (e: any) {
      setBurnError(e.message || 'Burn failed');
    } finally {
      setIsBurning(false);
    }
  };

  const handleAdminOverdraftAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/overdraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      });
      const data = await res.json();
      if (data.error) {
        triggerToast(`Action failed: ${data.error}`);
      } else {
        triggerToast(`Overdraft request ${action}ed!`);
        fetchDashboardData();
      }
    } catch (err: any) {
      triggerToast(`Error: ${err.message}`);
    }
  };

  const handleSearchTx = async (txId: string) => {
    if (!txId) return;
    setIsExplorerSearching(true);
    setExplorerError('');
    setExplorerResult(null);
    try {
      const res = await fetch(`/api/transactions/${txId}`);
      const data = await res.json();
      if (data.error) {
        setExplorerError(data.error);
      } else {
        setExplorerResult(data);
      }
    } catch (e: any) {
      setExplorerError(e.message || 'Transaction search failed.');
    } finally {
      setIsExplorerSearching(false);
    }
  };

  const handleExploreTx = (txId: string) => {
    setExplorerSearchQuery(txId);
    setActiveTab('explorer');
    handleSearchTx(txId);
  };

  // Update custom settings
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');
    setIsUpdatingUsername(true);
    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername })
      });
      const data = await res.json();
      if (data.error) {
        setUsernameError(data.error);
      } else {
        setUsernameSuccess(`Username updated to "${data.username}".`);
        checkSession();
      }
    } catch (e: any) {
      setUsernameError(e.message || 'Update failed');
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
        <RefreshCw style={{ animation: 'spin 2s linear infinite', color: '#8b5cf6' }} size={48} />
        <p style={{ color: '#94a3b8', fontWeight: 500 }}>Connecting to Neon Ledger Reserve...</p>
        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Not Logged In Layout
  if (!user) {
    return (
      <div className="container auth-container">
        <div className="panel auth-card">
          <div className="auth-header">
            <h1 className="logo-text">
              <Layers size={32} style={{ color: '#8b5cf6' }} />
              CoinFlow <span className="logo-badge">Reserve</span>
            </h1>
            <p className="auth-subtitle">
              {authMode === 'login' ? 'Access your traceable ledger account' : 'Register your credentials to claim a wallet'}
            </p>
          </div>

            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} id="auth-form">
              {authError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>{authError}</div>}
              {authSuccess && <div style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>{authSuccess}</div>}

              {authMode === 'register' && (
                <>
                  <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input id="register-name" className="input-field" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Desired Username</label>
                    <input id="register-username" className="input-field" type="text" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>People will send you coins by writing this username.</p>
                  </div>
                </>
              )}

              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input id="auth-email" className="input-field" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="input-group" style={{ marginBottom: '2rem' }}>
                <label className="input-label">Password</label>
                <input id="auth-password" className="input-field" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <button id="auth-submit" type="submit" className="btn btn-primary btn-glow" style={{ width: '100%', marginBottom: '1rem' }}>
                {authMode === 'login' ? 'Login to Wallet' : 'Open My Wallet'}
              </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: '#94a3b8' }}>
                {authMode === 'login' ? "Don't have a wallet yet? " : "Already have a wallet? "}
              </span>
              <button 
                type="button" 
                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); setAuthSuccess(''); }}
                style={{ background: 'none', border: 'none', color: '#8b5cf6', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                {authMode === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Calculate some wallet metrics
  const totalBalance = user.balance;
  const overdraftLimit = user.overdraftLimit;
  const availableFunds = totalBalance + overdraftLimit;

  // Helper to resolve transaction details for perfect history tracking
  const getTxDetails = (tx: any) => {
    const isSender = tx.senderId === user.id;
    const isReceiver = tx.receiverId === user.id;
    const isMint = tx.type === 'mint';
    const isSavingsDeposit = tx.type === 'savings_deposit';
    const isSavingsWithdrawal = tx.type === 'savings_withdrawal';
    const isFee = tx.type === 'fee_payment';
    const isDeposit = tx.type === 'deposit';

    let title = tx.description || 'Transaction';
    let subtext = new Date(tx.createdAt || tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date(tx.createdAt || tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
    let icon = <Activity size={15} />;
    let iconColor = 'var(--text-muted)';
    let iconBg = 'rgba(255, 255, 255, 0.05)';
    let amountSign = '';
    let amountColor = 'var(--text-primary)';

    if (isMint) {
      title = 'Admin Mint Credit';
      icon = <Plus size={15} />;
      iconColor = '#06b6d4'; // Cyan
      iconBg = 'rgba(6, 182, 212, 0.1)';
      amountSign = '+';
      amountColor = '#06b6d4';
    } else if (isSavingsDeposit) {
      title = 'Savings Stash';
      icon = <PiggyBank size={15} />;
      iconColor = '#8b5cf6'; // Purple
      iconBg = 'rgba(139, 92, 246, 0.1)';
      amountSign = '-';
      amountColor = '#f43f5e';
    } else if (isSavingsWithdrawal) {
      title = 'Savings Withdrawal';
      icon = <Wallet size={15} />;
      iconColor = '#06b6d4'; // Cyan
      iconBg = 'rgba(6, 182, 212, 0.1)';
      amountSign = '+';
      amountColor = '#06b6d4';
    } else if (isFee) {
      title = 'Ledger Gas Fee';
      icon = <Activity size={15} />;
      iconColor = '#f43f5e'; // Rose
      iconBg = 'rgba(244, 63, 94, 0.1)';
      amountSign = '-';
      amountColor = '#f43f5e';
    } else if (isSender) {
      title = `Sent to @${tx.receiver_username || 'vault'}`;
      icon = <ArrowUpRight size={15} />;
      iconColor = '#f43f5e'; // Rose
      iconBg = 'rgba(244, 63, 94, 0.1)';
      amountSign = '-';
      amountColor = '#f43f5e';
    } else if (isReceiver) {
      if (isDeposit && !tx.senderId) {
        title = tx.description?.toLowerCase().includes('interest') ? 'Savings Interest' : 'Mint Deposit';
        icon = <TrendingUp size={15} />;
        iconColor = '#fbbf24'; // Gold
        iconBg = 'rgba(251, 191, 36, 0.1)';
      } else {
        title = `Received from @${tx.sender_username || 'system'}`;
        icon = <ArrowDownLeft size={15} />;
        iconColor = '#06b6d4'; // Cyan
        iconBg = 'rgba(6, 182, 212, 0.1)';
      }
      amountSign = '+';
      amountColor = '#06b6d4';
    }

    // Append custom request note/justification if it doesn't duplicate structural logs
    if (tx.description && 
        tx.description !== title && 
        !tx.description.includes('Transferred') && 
        !tx.description.includes('Withdrew') && 
        !tx.description.includes('interest')) {
      subtext = `${tx.description} • ${subtext}`;
    }

    return { title, subtext, icon, iconColor, iconBg, amountSign, amountColor };
  };

  // Render Client Dashboard
  return (
    <div className="container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="notification-toast">
          <Activity size={20} style={{ color: '#8b5cf6', animation: 'pulse 1s infinite' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="header-wrapper">
        <div className="logo-container">
          <h1 className="logo-text">
            <Layers size={28} />
            CoinFlow
          </h1>
          <span className="logo-badge">{user.role}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="user-badge">
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role-tag">@{user.username}</span>
            </div>
          </div>

          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }} title="Log Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="tabs-nav">
        <button onClick={() => setActiveTab('wallet')} className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}>
          <Wallet size={16} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} /> Wallet & Ledger
        </button>
        <button onClick={() => setActiveTab('savings')} className={`tab-btn ${activeTab === 'savings' ? 'active' : ''}`}>
          <PiggyBank size={16} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} /> Savings Vault
        </button>
        <button onClick={() => setActiveTab('requests')} className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}>
          <Send size={16} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} /> Money Requests
        </button>
        <button onClick={() => setActiveTab('coins')} className={`tab-btn ${activeTab === 'coins' ? 'active' : ''}`}>
          <Compass size={16} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} /> Coin Tracing
        </button>
        <button onClick={() => setActiveTab('explorer')} className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}>
          <Search size={16} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} /> Explorer
        </button>
        {user.role === 'admin' && (
          <button onClick={() => setActiveTab('admin')} className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }}>
            <ShieldCheck size={16} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom', color: '#fbbf24' }} /> Reserve Admin
          </button>
        )}
      </div>

      {/* MAIN LAYOUT */}
      <div className="dashboard-grid">
        
        {/* LEFT COLUMN: ACTIVE CONTENT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* TAB 1: WALLET & LEDGER */}
          {activeTab === 'wallet' && (
            <>
              {/* Account summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="panel card-metric" style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
                  <div className="metric-label">Active Balance</div>
                  <div className="metric-value" style={{ color: totalBalance >= 0 ? 'var(--text-primary)' : 'var(--accent-tertiary)' }}>
                    ${totalBalance.toFixed(2)}
                  </div>
                  <div className="metric-sub">Circulating liquid coins</div>
                </div>

                <div className="panel card-metric" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
                  <div className="metric-label">Overdraft Limit</div>
                  <div className="metric-value" style={{ color: 'var(--accent-gold)' }}>
                    ${overdraftLimit.toFixed(2)}
                  </div>
                  <div className="metric-sub">Max negative capacity</div>
                </div>

                <div className="panel card-metric" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                  <div className="metric-label">Available Capacity</div>
                  <div className="metric-value" style={{ color: '#fff' }}>
                    ${availableFunds.toFixed(2)}
                  </div>
                  <div className="metric-sub">Wallet + overdraft limit</div>
                </div>
              </div>

              {/* Transfer Form Panel */}
              <div className="panel">
                <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Send size={20} style={{ color: 'var(--accent-primary)' }} /> Send Coins by Username
                </h3>

                <form onSubmit={handleTransfer}>
                  {transferError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>{transferError}</div>}
                  {transferSuccess && <div style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>{transferSuccess}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label className="input-label">Receiver Username</label>
                      <input className="input-field" type="text" placeholder="e.g. alice" value={transferUser} onChange={(e) => setTransferUser(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Amount (USD)</label>
                      <input className="input-field" type="number" step="0.01" min="0.01" placeholder="e.g. 25.50" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} required />
                    </div>
                  </div>

                  {transferAmount && parseFloat(transferAmount) > 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px' }}>
                      <Info size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} /> 
                      Estimated transfer fee: <strong style={{ color: 'var(--accent-tertiary)' }}>${Math.min(10.00, Math.max(0.10, parseFloat(transferAmount) * 0.01)).toFixed(2)}</strong> (1% network cost). Admins send free.
                    </p>
                  )}

                  <button type="submit" disabled={isSending} className="btn btn-primary btn-glow" style={{ width: '100%' }}>
                    {isSending ? 'Verifying Coin Ledger...' : 'Authorize Coin Transfer'}
                  </button>
                </form>
              </div>

              {/* Overdraft request panel */}
              <div className="panel">
                <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} style={{ color: 'var(--accent-gold)' }} /> Request Overdraft Privilege
                </h3>

                <form onSubmit={handleOverdraftRequest}>
                  {overdraftError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>{overdraftError}</div>}
                  {overdraftSuccess && <div style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>{overdraftSuccess}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label className="input-label">Requested Limit ($)</label>
                      <input className="input-field" type="number" min="1" placeholder="e.g. 500" value={overdraftAmount} onChange={(e) => setOverdraftAmount(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Justification / Reason</label>
                      <input className="input-field" type="text" placeholder="e.g. Business inventory liquidity" value={overdraftReason} onChange={(e) => setOverdraftReason(e.target.value)} required />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--accent-gold)' }}>
                    Submit Request to Admin
                  </button>
                </form>

                {myOverdraftRequests.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Overdraft History</h4>
                    {myOverdraftRequests.map((req) => (
                      <div key={req.id} className="item-row" style={{ padding: '0.6rem 1rem' }}>
                        <div className="item-details">
                          <span className="item-title" style={{ fontSize: '0.9rem' }}>Limit: ${parseFloat(req.requestedAmount || req.requested_amount).toFixed(2)}</span>
                          <span className="item-sub">{req.reason}</span>
                        </div>
                        <span className={`badge-status badge-status-${req.status}`}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: SAVINGS VAULT */}
          {activeTab === 'savings' && (
            <div className="panel">
              <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PiggyBank size={28} style={{ color: 'var(--accent-primary)' }} /> Savings Account
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Stash your active coins here to accumulate simulated interest. Saved coins are backed in the Reserve Vault.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="panel card-metric" style={{ background: 'rgba(139, 92, 246, 0.05)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                  <div className="metric-label">Savings Balance</div>
                  <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>
                    ${user.savingsBalance.toFixed(2)}
                  </div>
                  <div className="metric-sub">Locked in yield-bearing vault</div>
                </div>

                <div className="panel card-metric" style={{ background: 'rgba(6, 182, 212, 0.05)', borderColor: 'rgba(6, 182, 212, 0.2)' }}>
                  <div className="metric-label">Yield Rate</div>
                  <div className="metric-value" style={{ color: 'var(--accent-secondary)' }}>
                    +5.00%
                  </div>
                  <div className="metric-sub">Fast-forward simulation yield</div>
                </div>
              </div>

              {/* Savings Action Form */}
              <form onSubmit={handleSavingsActionSubmit} style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--panel-border)' }}>
                {savingsError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>{savingsError}</div>}
                {savingsSuccess && <div style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>{savingsSuccess}</div>}

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setSavingsAction('deposit')} 
                    className={`btn ${savingsAction === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    Deposit to Savings
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSavingsAction('withdraw')} 
                    className={`btn ${savingsAction === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    Withdraw to Active Wallet
                  </button>
                </div>

                <div className="input-group">
                  <label className="input-label">Coin Amount ($)</label>
                  <input className="input-field" type="number" step="0.01" min="0.01" placeholder="e.g. 100.00" value={savingsAmount} onChange={(e) => setSavingsAmount(e.target.value)} required />
                </div>

                <button type="submit" disabled={isSavingsLoading} className="btn btn-primary btn-glow" style={{ width: '100%' }}>
                  {isSavingsLoading ? 'Processing transaction...' : `Confirm ${savingsAction === 'deposit' ? 'Savings Deposit' : 'Savings Withdrawal'}`}
                </button>
              </form>

              {/* Yield Simulation Controller */}
              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Simulated Yield Controller</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Don't wait for calendar months. Fast-forward the clock to immediately compound 5% interest on your savings account!
                </p>
                <button type="button" onClick={triggerInterestSimulation} disabled={isSimulatingInterest} className="btn btn-secondary btn-glow" style={{ borderColor: 'var(--accent-secondary)' }}>
                  <RefreshCw size={16} style={{ marginRight: '0.25rem', animation: isSimulatingInterest ? 'spin 1s linear infinite' : 'none' }} /> {isSimulatingInterest ? 'Fast-forwarding clock...' : 'Fast-Forward 30 Days (Accrue Interest)'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MONEY REQUESTS */}
          {activeTab === 'requests' && (
            <div className="panel">
              <h2 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={24} style={{ color: 'var(--accent-primary)' }} /> Money Request Board
              </h2>

              {/* Create Request Form */}
              <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--panel-border)', marginBottom: '2rem' }}>
                <form onSubmit={handleRequest}>
                  {requestError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>{requestError}</div>}
                  {requestSuccess && <div style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>{requestSuccess}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label className="input-label">Payer Username</label>
                      <input className="input-field" type="text" placeholder="e.g. bob" value={requestUser} onChange={(e) => setRequestUser(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Requested Amount ($)</label>
                      <input className="input-field" type="number" step="0.01" min="0.01" placeholder="e.g. 50.00" value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} required />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Description / Note</label>
                    <input className="input-field" type="text" placeholder="e.g. Lunch split, Project invoice" value={requestDesc} onChange={(e) => setRequestDesc(e.target.value)} />
                  </div>

                  <button type="submit" disabled={isIssuingRequest} className="btn btn-primary btn-glow" style={{ width: '100%' }}>
                    {isIssuingRequest ? 'Sending request...' : 'Issue Money Request'}
                  </button>
                </form>
              </div>

              {/* List of Requests */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                
                {/* Received Requests */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>Incoming Requests</h3>
                  {receivedRequests.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No incoming requests.</p>
                  ) : (
                    receivedRequests.map((req) => (
                      <div key={req.id} className="panel" style={{ padding: '1rem', marginBottom: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 600 }}>@{req.requester_username}</span>
                          <span style={{ fontWeight: 800, color: 'var(--accent-gold)' }}>${parseFloat(req.amount).toFixed(2)}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{req.description}</p>
                        
                        {req.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleRequestAction(req.id, 'approve')} disabled={processingRequests[req.id]} className="btn btn-primary" style={{ flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                              <Check size={14} style={{ marginRight: '0.25rem' }} /> {processingRequests[req.id] ? 'Approving...' : 'Approve'}
                            </button>
                            <button onClick={() => handleRequestAction(req.id, 'decline')} disabled={processingRequests[req.id]} className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--accent-tertiary)' }}>
                              <X size={14} style={{ marginRight: '0.25rem' }} /> {processingRequests[req.id] ? 'Declining...' : 'Decline'}
                            </button>
                          </div>
                        ) : (
                          <span className={`badge-status badge-status-${req.status}`} style={{ display: 'inline-block' }}>{req.status}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Sent Requests */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>Outgoing Requests</h3>
                  {sentRequests.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No outgoing requests.</p>
                  ) : (
                    sentRequests.map((req) => (
                      <div key={req.id} className="item-row" style={{ padding: '0.75rem 1rem' }}>
                        <div className="item-details">
                          <span className="item-title" style={{ fontSize: '0.9rem' }}>To: @{req.payer_username}</span>
                          <span className="item-sub">{req.description}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>${parseFloat(req.amount).toFixed(2)}</div>
                          <span className={`badge-status badge-status-${req.status}`} style={{ fontSize: '0.6rem' }}>{req.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COIN TRACING */}
          {activeTab === 'coins' && (
            <div className="panel">
              <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Compass size={28} style={{ color: 'var(--accent-secondary)' }} /> Coin Lineage Tracing
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Every single coin unit in this system has a unique serial number and a recursive history tree. Click on any coin you own (active) or have spent to view its absolute lineage back to the original minting.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                
                {/* User's Coins List */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>Circulating Coins in Your Wallet</h3>
                  {activeCoins.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>You do not currently own any discrete coin blocks.</p>
                  ) : (
                    activeCoins.map((coin) => (
                      <div 
                        key={coin.id} 
                        onClick={() => fetchCoinLineage(coin.id)}
                        className="item-row" 
                        style={{ 
                          cursor: 'pointer', 
                          borderColor: selectedCoinId === coin.id ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.03)',
                          background: selectedCoinId === coin.id ? 'rgba(6, 182, 212, 0.05)' : 'rgba(255,255,255,0.02)'
                        }}
                      >
                        <div className="item-details">
                          <span className="item-title" style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{coin.serialNumber || coin.serial_number}</span>
                          <span className="item-sub">Minted: {new Date(coin.mintedAt || coin.mintedAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="item-amount amount-positive">${parseFloat(coin.amount).toFixed(2)}</span>
                          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </div>
                    ))
                  )}

                  <h3 style={{ fontSize: '1.1rem', marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>Spent Coins History</h3>
                  {spentCoins.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No spent coin history.</p>
                  ) : (
                    spentCoins.map((coin) => (
                      <div 
                        key={coin.id} 
                        onClick={() => fetchCoinLineage(coin.id)}
                        className="item-row" 
                        style={{ 
                          cursor: 'pointer', 
                          opacity: 0.7,
                          borderColor: selectedCoinId === coin.id ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.03)',
                          background: selectedCoinId === coin.id ? 'rgba(6, 182, 212, 0.05)' : 'rgba(255,255,255,0.02)'
                        }}
                      >
                        <div className="item-details">
                          <span className="item-title" style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{coin.serialNumber || coin.serial_number}</span>
                          <span className="item-sub">Spent on transaction: {(coin.spentByTransactionId || coin.spentByTransactionId || '').substring(0, 10)}...</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="item-amount amount-neutral">${parseFloat(coin.amount).toFixed(2)}</span>
                          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Coin lineage visual tree view */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>Coin Lineage Pedigree</h3>
                  {!selectedCoinId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', border: '1px dashed var(--panel-border)', borderRadius: '12px', color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
                      <Compass size={32} style={{ marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.85rem' }}>Select a coin serial number from the left to trace its pedigree tree.</p>
                    </div>
                  ) : coinLineageError ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', border: '1px dashed rgba(244,63,94,0.3)', borderRadius: '12px', color: '#f43f5e', padding: '2rem', textAlign: 'center', background: 'rgba(244,63,94,0.02)' }}>
                      <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.85rem' }}>{coinLineageError}</p>
                    </div>
                  ) : !selectedCoinLineage ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
                      <RefreshCw style={{ animation: 'spin 2s linear infinite', color: 'var(--accent-secondary)' }} size={24} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Analyzing parent blocks recursively...</p>
                    </div>
                  ) : (
                    <div className="lineage-container">
                      <div className="lineage-nodes">
                        {selectedCoinLineage.map((node, i) => (
                          <div key={node.id} className="lineage-node">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent-secondary)' }}>
                                {node.serialNumber || node.serial_number}
                              </span>
                              <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                                ${parseFloat(node.amount).toFixed(2)}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <strong>Owner:</strong> {node.ownerId ? `@${node.owner_username || node.ownerId.substring(0, 8)}` : 'System Reserve Vault'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              <strong>Operation:</strong> {node.tx_description || 'Initial Ledger Genesis Mint'}
                            </div>
                            {node.tx_type && (
                              <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 700, marginTop: '0.4rem', background: 'rgba(139,92,246,0.1)', display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                {node.tx_type}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Info size={14} style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }} /> 
                        This coin history trace was retrieved using a recursive CTE walking parent inputs back to the root genesis mint block.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: EXPLORER */}
          {activeTab === 'explorer' && (
            <div className="panel">
              <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={28} style={{ color: 'var(--accent-secondary)' }} /> Ledger Transaction Explorer
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Search any transaction ID (txid) on the CoinFlow network to trace its UTXO inputs, outputs, fee routing, and cryptographic metadata.
              </p>

              <form onSubmit={(e) => { e.preventDefault(); handleSearchTx(explorerSearchQuery); }} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
                <input 
                  className="input-field" 
                  style={{ marginBottom: 0, flex: 1, fontFamily: 'monospace' }} 
                  type="text" 
                  placeholder="Enter Transaction ID (e.g. tx_abc123...)" 
                  value={explorerSearchQuery} 
                  onChange={(e) => setExplorerSearchQuery(e.target.value)} 
                  required 
                />
                <button type="submit" disabled={isExplorerSearching} className="btn btn-primary btn-glow" style={{ whiteSpace: 'nowrap' }}>
                  {isExplorerSearching ? 'Querying...' : 'Query Ledger'}
                </button>
              </form>

              {explorerError && (
                <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <strong>Error:</strong> {explorerError}
                </div>
              )}

              {explorerResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Tx Summary */}
                  <div className="panel" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent-secondary)' }}>
                      Transaction Overview
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Transaction ID</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-secondary)', marginTop: '0.2rem' }}>{explorerResult.transaction.id}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Type</div>
                        <div style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '0.2rem', fontSize: '0.8rem' }}>{explorerResult.transaction.type}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Total Amount</div>
                        <div style={{ fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>${parseFloat(explorerResult.transaction.amount).toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Network Fee</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-tertiary)', marginTop: '0.2rem' }}>${parseFloat(explorerResult.transaction.fee).toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Sender</div>
                        <div style={{ marginTop: '0.2rem', fontWeight: 600 }}>{explorerResult.transaction.sender_username ? `@${explorerResult.transaction.sender_username} (${explorerResult.transaction.sender_name})` : 'System / Central Reserve'}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Receiver</div>
                        <div style={{ marginTop: '0.2rem', fontWeight: 600 }}>{explorerResult.transaction.receiver_username ? `@${explorerResult.transaction.receiver_username} (${explorerResult.transaction.receiver_name})` : 'System / Central Reserve'}</div>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Description / Payload</div>
                        <div style={{ marginTop: '0.2rem', fontStyle: 'italic' }}>{explorerResult.transaction.description || 'No description payload attached.'}</div>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Timestamp</div>
                        <div style={{ marginTop: '0.2rem' }}>{new Date(explorerResult.transaction.createdAt || explorerResult.transaction.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* UTXO Inputs & Outputs Visual Diagram */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    
                    {/* Inputs Spent */}
                    <div className="panel" style={{ background: 'rgba(244,63,94,0.02)', borderColor: 'rgba(244,63,94,0.1)' }}>
                      <h3 style={{ fontSize: '0.95rem', color: '#f43f5e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ArrowUpRight size={16} /> Consumed Inputs (Spent Coin Blocks)
                      </h3>
                      {explorerResult.spentBlocks.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No coin blocks consumed as input (e.g. system minting / genesis credit).</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {explorerResult.spentBlocks.map((cb: any) => (
                            <div key={cb.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                <span style={{ fontFamily: 'monospace' }}>{cb.serialNumber}</span>
                                <span style={{ color: '#f43f5e' }}>-${parseFloat(cb.amount).toFixed(2)}</span>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                Owner: {cb.owner_username ? `@${cb.owner_username}` : 'Central Vault'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Outputs Created */}
                    <div className="panel" style={{ background: 'rgba(6,182,212,0.02)', borderColor: 'rgba(6,182,212,0.1)' }}>
                      <h3 style={{ fontSize: '0.95rem', color: '#06b6d4', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ArrowDownLeft size={16} /> Created Outputs (New Coin Blocks)
                      </h3>
                      {explorerResult.createdBlocks.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No coin blocks created (e.g. system supply burn).</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {explorerResult.createdBlocks.map((cb: any) => (
                            <div key={cb.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                <span style={{ fontFamily: 'monospace' }}>{cb.serialNumber}</span>
                                <span style={{ color: '#06b6d4' }}>+${parseFloat(cb.amount).toFixed(2)}</span>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                Owner: {cb.owner_username ? `@${cb.owner_username}` : 'Central Vault'} | Status: {cb.status}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 5: ADMIN CONSOLE */}
          {activeTab === 'admin' && user.role === 'admin' && (
            <div className="panel">
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)' }}>
                <ShieldCheck size={28} /> Central Bank & Reserve Administration
              </h2>

              {/* Metrics Row */}
              {adminMetrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                  <div className="panel card-metric" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                    <div className="metric-label">Total Coins Minted</div>
                    <div className="metric-value">${adminMetrics.totalMinted.toFixed(2)}</div>
                    <div className="metric-sub">Total backed supply</div>
                  </div>
                  <div className="panel card-metric" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
                    <div className="metric-label">Reserve Vault Balance</div>
                    <div className="metric-value">${adminMetrics.vaultReserve.toFixed(2)}</div>
                    <div className="metric-sub">Lending reserve vault capacity</div>
                  </div>
                  <div className="panel card-metric" style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
                    <div className="metric-label">In Circulation</div>
                    <div className="metric-value">${adminMetrics.inCirculation.toFixed(2)}</div>
                    <div className="metric-sub">Coins active in user wallets</div>
                  </div>
                  <div className="panel card-metric" style={{ borderLeft: '4px solid var(--accent-tertiary)' }}>
                    <div className="metric-label">Accumulated Fees</div>
                    <div className="metric-value">${adminMetrics.accumulatedFees.toFixed(2)}</div>
                    <div className="metric-sub">Total network fees accrued</div>
                  </div>
                </div>
              )}

              {/* Mint, Deposit, Burn, Deduct Forms */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--panel-border)' }}>
                
                {/* Minting */}
                <div className="panel" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Plus size={18} /> Mint New Supply
                  </h3>
                  <form onSubmit={handleMint}>
                    {mintError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>{mintError}</div>}
                    {mintSuccess && <div style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>{mintSuccess}</div>}

                    <div className="input-group">
                      <label className="input-label">Amount of Coins to Mint</label>
                      <input className="input-field" type="number" step="0.01" placeholder="e.g. 50000.00" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={isMinting} className="btn btn-primary btn-glow" style={{ width: '100%' }}>
                      {isMinting ? 'Minting...' : 'Mint & Add to System Vault'}
                    </button>
                  </form>
                </div>

                {/* Deposit Admin Credit */}
                <div className="panel" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowDownLeft size={18} /> Credit User (Admin Deposit)
                  </h3>
                  <form onSubmit={handleAdminDeposit}>
                    {depositError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>{depositError}</div>}
                    {depositSuccess && <div style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>{depositSuccess}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Username</label>
                        <input className="input-field" type="text" placeholder="bob" value={depositUser} onChange={(e) => setDepositUser(e.target.value)} required />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Amount ($)</label>
                        <input className="input-field" type="number" step="0.01" placeholder="1000.00" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
                      </div>
                    </div>
                    <button type="submit" disabled={isAdminDepositing} className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--accent-secondary)' }}>
                      {isAdminDepositing ? 'Processing...' : 'Fund Deposit from Reserve'}
                    </button>
                  </form>
                </div>

                {/* Burn Supply */}
                <div className="panel" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f43f5e' }}>
                    <X size={18} /> Burn Reserve Supply
                  </h3>
                  <form onSubmit={handleAdminBurn}>
                    {burnError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>{burnError}</div>}
                    {burnSuccess && <div style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>{burnSuccess}</div>}

                    <div className="input-group">
                      <label className="input-label">Amount of Coins to Burn</label>
                      <input className="input-field" type="number" step="0.01" placeholder="e.g. 5000.00" value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={isBurning} className="btn btn-primary btn-glow" style={{ width: '100%', background: 'linear-gradient(135deg, #f43f5e, #be123c)', borderColor: '#f43f5e' }}>
                      {isBurning ? 'Burning...' : 'Permanently Burn from System Vault'}
                    </button>
                  </form>
                </div>

                {/* Deduct User Balance */}
                <div className="panel" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowUpRight size={18} /> Debit User (Admin Deduct)
                  </h3>
                  <form onSubmit={handleAdminDeduct}>
                    {deductError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>{deductError}</div>}
                    {deductSuccess && <div style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>{deductSuccess}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Username</label>
                        <input className="input-field" type="text" placeholder="bob" value={deductUser} onChange={(e) => setDeductUser(e.target.value)} required />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Amount ($)</label>
                        <input className="input-field" type="number" step="0.01" placeholder="100.00" value={deductAmount} onChange={(e) => setDeductAmount(e.target.value)} required />
                      </div>
                    </div>
                    <button type="submit" disabled={isDeducting} className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--accent-tertiary)' }}>
                      {isDeducting ? 'Processing...' : 'Deduct Balance to Reserve'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Overdraft Review Board */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>Overdraft Request Board</h3>
                {adminOverdraftRequests.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No pending overdraft requests.</p>
                ) : (
                  adminOverdraftRequests.map((req) => (
                    <div key={req.id} className="panel" style={{ padding: '1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>@{req.username} (Current Bal: ${parseFloat(req.balance).toFixed(2)})</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          <strong>Reason:</strong> {req.reason}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Requested Limit: <strong style={{ color: 'var(--accent-gold)' }}>${parseFloat(req.requested_amount || req.requestedAmount).toFixed(2)}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleAdminOverdraftAction(req.id, 'approve')} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                          Approve
                        </button>
                        <button onClick={() => handleAdminOverdraftAction(req.id, 'reject')} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--accent-tertiary)' }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* User management list */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>Registered Users Directory</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {adminUsers.map((u) => (
                    <div key={u.id} className="item-row" style={{ padding: '0.75rem 1rem' }}>
                      <div className="item-details">
                        <span className="item-title">@{u.username || 'unconfigured'} ({u.name})</span>
                        <span className="item-sub">Role: {u.role} | Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active</div>
                          <div style={{ fontWeight: 700, color: parseFloat(u.balance) >= 0 ? 'var(--accent-secondary)' : 'var(--accent-tertiary)' }}>
                            ${parseFloat(u.balance).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Savings</div>
                          <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                            ${parseFloat(u.savingsBalance).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Overdraft Limit</div>
                          <div style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                            ${parseFloat(u.overdraftLimit).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suspicious audit logs */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>System Audit & Security Logs</h3>
                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {adminLogs.map((log) => (
                    <div key={log.id} className="item-row" style={{ padding: '0.6rem 1rem', borderLeft: log.isSuspicious || log.isSuspicious ? '3px solid var(--accent-tertiary)' : '1px solid var(--panel-border)', background: log.isSuspicious || log.isSuspicious ? 'rgba(244,63,94,0.05)' : 'rgba(255,255,255,0.01)' }}>
                      <div className="item-details">
                        <span className="item-title" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {(log.isSuspicious || log.isSuspicious) && <AlertTriangle size={14} style={{ color: 'var(--accent-tertiary)' }} />}
                          {log.action}
                        </span>
                        <span className="item-sub">{log.details}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt || log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: QUICK STATS & SETTINGS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Real-time Ledger Info */}
          <div className="panel">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--accent-secondary)' }} /> Live Ledger Feed
            </h3>
            
            {/* Custom SVG Trend Chart */}
            <div className="chart-container" style={{ marginBottom: '1.5rem' }}>
              {/* Calculate dynamic bars based on last transactions */}
              {[...transactions].reverse().slice(-7).map((tx, idx) => {
                const isPositive = tx.receiverId === user.id;
                const amt = parseFloat(tx.amount);
                // Map to height 10% - 90%
                const heightVal = Math.min(85, Math.max(15, (amt / 100) * 80));
                return (
                  <div key={tx.id} className="chart-bar-wrapper">
                    <div 
                      className="chart-bar" 
                      style={{ 
                        height: `${heightVal}%`, 
                        background: isPositive ? 'linear-gradient(to top, #0891b2, #22d3ee)' : 'linear-gradient(to top, #e11d48, #fda4af)'
                      }}
                      data-val={isPositive ? `+$${amt.toFixed(2)}` : `-$${amt.toFixed(2)}`}
                    />
                    <span className="chart-label">tx{idx+1}</span>
                  </div>
                );
              })}
              {transactions.length < 3 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
                  Execute more transactions to visualize ledger trends.
                </div>
              )}
            </div>

            {/* List of Recent Transactions */}
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Recent Ledger Entries</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
              {transactions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No transactions recorded.</p>
              ) : (
                transactions.map((tx) => {
                  const details = getTxDetails(tx);
                  return (
                    <div key={tx.id} className="item-row" style={{ padding: '0.6rem 0.8rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: details.iconBg, 
                        color: details.iconColor, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {details.icon}
                      </div>
                      <div className="item-details" style={{ flex: 1, minWidth: 0 }}>
                        <span className="item-title" style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', color: 'var(--text-primary)' }}>
                          {details.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                          <button 
                            onClick={() => handleExploreTx(tx.id)}
                            style={{ 
                              background: 'rgba(6,182,212,0.1)', 
                              border: 'none', 
                              color: '#06b6d4', 
                              fontSize: '0.65rem', 
                              fontFamily: 'monospace', 
                              cursor: 'pointer', 
                              padding: '0.1rem 0.35rem', 
                              borderRadius: '4px',
                              fontWeight: 600
                            }}
                            title="Click to explore transaction details"
                          >
                            {tx.id}
                          </button>
                          <span className="item-sub" style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                            • {details.subtext}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: details.amountColor, flexShrink: 0 }}>
                        {details.amountSign}${parseFloat(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* User Settings & Ledger Details */}
          <div className="panel">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--accent-primary)' }} /> Ledger Profile Settings
            </h3>

            <form onSubmit={handleUpdateUsername}>
              {usernameError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>{usernameError}</div>}
              {usernameSuccess && <div style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>{usernameSuccess}</div>}

              <div className="input-group">
                <label className="input-label">Custom Username Handle</label>
                <input 
                  className="input-field" 
                  type="text" 
                  value={newUsername} 
                  onChange={(e) => setNewUsername(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" disabled={isUpdatingUsername} className="btn btn-secondary" style={{ width: '100%' }}>
                {isUpdatingUsername ? 'Updating handle...' : 'Update Handle'}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
