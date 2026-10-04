import { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  X,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  KeyRound
} from "lucide-react";
import img12 from '../assets/image.png';
import baseUrl from '../api/api';

const Login = () => {
  const [isResetMode, setIsResetMode] = useState(false);
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [EmpId, setEmpId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Reset Password Form States
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Common States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isFocused, setIsFocused] = useState({ 
    email: false, 
    pass: false, 
    resetEmail: false, 
    newPass: false, 
    confirmPass: false 
  });

  // Load remembered email on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('rootfin_saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setResetEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (e) {
      console.warn('Unable to access localStorage for saved email', e);
    }
  }, []);

  // Switch to reset mode
  const handleOpenResetMode = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setResetEmail(email.trim());
    setNewPassword('');
    setConfirmPassword('');
    setIsResetMode(true);
  };

  // Switch back to login mode
  const handleBackToLogin = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsResetMode(false);
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();
    const trimmedEmpId = EmpId.trim();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email or username');
      return;
    }
    if (!trimmedEmpId) {
      setErrorMessage('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(baseUrl.baseUrl + 'user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail, EmpId: trimmedEmpId }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        try {
          if (rememberMe) {
            localStorage.setItem('rootfin_saved_email', trimmedEmail);
          } else {
            localStorage.removeItem('rootfin_saved_email');
          }
        } catch (e) {
          // Ignore
        }

        let userObj = { ...data.user };
        if (userObj.power === 'admin') {
          if (!['858', '718'].includes(String(userObj.locCode))) {
            userObj.locCode = '858';
            userObj.username = 'Warehouse';
            userObj.storeName = 'Warehouse';
          }
        }

        localStorage.setItem("rootfinuser", JSON.stringify(userObj));
        setSuccessMessage('Login successful! Redirecting to workspace...');

        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        setErrorMessage(data.message || 'Invalid credentials. Please verify your details.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error during login:', error);
      setErrorMessage('Server connection error. Please try again.');
      setLoading(false);
    }
  };

  // Handle Password Reset Submit
  const handleResetSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedResetEmail = resetEmail.trim();

    if (!trimmedResetEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!newPassword) {
      setErrorMessage('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(baseUrl.baseUrl + 'user/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: trimmedResetEmail, 
          newPassword: newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message || 'Password updated successfully! You can now log in.');
        setEmail(trimmedResetEmail);
        setEmpId(newPassword);
        setLoading(false);

        // Switch back to login view after short delay
        setTimeout(() => {
          setIsResetMode(false);
        }, 1500);
      } else {
        setErrorMessage(data.message || 'Failed to reset password. Please check the email address.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Reset Password Error:', error);
      setErrorMessage('Unable to connect to server. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] font-sans antialiased text-slate-800 selection:bg-[#9B48D7] selection:text-white relative overflow-hidden p-4 sm:p-8">
      
      {/* ============================================================
          SMOOTH CSS ANIMATIONS & MICRO-INTERACTIONS
          ============================================================ */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes blobFloat1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.08); }
        }
        @keyframes blobFloat2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-30px, 40px) scale(0.95); }
        }
        @keyframes shimmerGlide {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(200%); }
        }
        @keyframes cardPop {
          0% { opacity: 0; transform: translateY(12px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0px) scale(1); }
        }
        .anim-float { animation: floatSlow 5s ease-in-out infinite; }
        .anim-blob-1 { animation: blobFloat1 16s ease-in-out infinite; }
        .anim-blob-2 { animation: blobFloat2 20s ease-in-out infinite; }
        .anim-card-pop { animation: cardPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .btn-pink-shimmer:hover .shimmer-layer {
          animation: shimmerGlide 0.85s ease-out forwards;
        }
      `}</style>

      {/* Ambient background aura (clean light mode) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="anim-blob-1 absolute -top-24 -left-24 w-96 h-96 rounded-full bg-purple-200/40 blur-3xl" />
        <div className="anim-blob-2 absolute top-1/3 -right-24 w-[480px] h-[480px] rounded-full bg-pink-200/30 blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 w-[500px] h-[500px] rounded-full bg-teal-100/30 blur-3xl" />
        
        {/* Subtle geometric dot grid */}
        <div 
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* ============================================================
          MAIN WRAPPER: Responsive Split Experience
          ============================================================ */}
      <div className="anim-card-pop relative z-10 w-full max-w-5xl bg-white rounded-3xl shadow-2xl shadow-slate-300/50 border border-slate-200/90 overflow-hidden flex flex-col lg:flex-row">
        
        {/* LEFT SIDE: Visual Brand & Financial Artwork with Clean Simple Text */}
        <div className="lg:w-1/2 w-full bg-gradient-to-br from-[#01352c] via-[#015244] to-[#016E5B] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden text-white">
          
          {/* Subtle background glow */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-teal-300/15 blur-2xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md p-1.5 border border-white/20 shadow-md flex items-center justify-center">
              <img src={img12} alt="Rootments Logo" className="w-full h-full object-contain filter drop-shadow" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                ROOTMENTS
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-white/15 text-emerald-200 border border-white/20">
                  ERP
                </span>
              </h2>
              <p className="text-xs text-emerald-100/70 font-medium">Jewellery & Retail Cloud</p>
            </div>
          </div>

          {/* Center: Headline & Clean Simple Text Highlights */}
          <div className="relative z-10 my-8 lg:my-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug mb-3">
              Secure & Efficient <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-amber-200">Financial</span> Software
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed max-w-md mb-6">
              Complete multi-store ERP solution for jewellery retail, daybook operations, and inventory reconciliation.
            </p>

            {/* Simple Animated Glass Feature List */}
            <div className="space-y-3 anim-float">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-300 flex items-center justify-center shrink-0 mt-0.5 border border-pink-400/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">Automated Daybook & Ledgers</h3>
                  <p className="text-[11px] text-emerald-100/70 mt-0.5">Real-time tracking of store income, expenses, and cash-bank settlements.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-400/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">Stock & Transfer Management</h3>
                  <p className="text-[11px] text-emerald-100/70 mt-0.5">Instant barcode verification, item adjustments, and store dispatch workflows.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 flex items-center gap-2 text-xs text-emerald-100/60 pt-2 border-t border-white/10">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Encrypted Session • Rootments Enterprises © {new Date().getFullYear()}</span>
          </div>
        </div>

        {/* RIGHT SIDE: Interactive Login & Reset Password Card */}
        <div className="lg:w-1/2 w-full p-8 sm:p-12 flex flex-col justify-center bg-white relative">
          
          <div className="max-w-md w-full mx-auto">
            
            {/* Header with dynamic mode switch */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-[#9B48D7] text-xs font-bold">
                  {isResetMode ? <KeyRound className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isResetMode ? "Password Recovery" : "Portal Login"}</span>
                </div>

                {isResetMode && (
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-xs text-[#9B48D7] hover:text-[#8637c3] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Login
                  </button>
                )}
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {isResetMode ? "Change Password" : "Welcome Back"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {isResetMode 
                  ? "Enter your account email and choose a new password." 
                  : "Enter your credentials to access your store or administrative workspace."}
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium leading-relaxed">{errorMessage}</span>
                <button 
                  type="button" 
                  onClick={() => setErrorMessage('')} 
                  className="text-rose-400 hover:text-rose-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

            {/* ============================================================
                VIEW 1: LOGIN FORM
                ============================================================ */}
            {!isResetMode && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Email / Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address or Username
                  </label>
                  <div className={`relative flex items-center rounded-xl bg-slate-50 border transition-all duration-200 ${
                    isFocused.email 
                      ? 'border-[#9B48D7] bg-white ring-4 ring-[#9B48D7]/15' 
                      : 'border-slate-300 hover:border-slate-400'
                  }`}>
                    <div className={`pl-3.5 transition-colors ${isFocused.email ? 'text-[#9B48D7]' : 'text-slate-400'}`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoComplete="username"
                      className="w-full py-2.5 px-3 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none font-medium"
                      placeholder="e.g. Emp411 or email@rootments.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setIsFocused(prev => ({ ...prev, email: true }))}
                      onBlur={() => setIsFocused(prev => ({ ...prev, email: false }))}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenResetMode}
                      className="text-xs text-[#9B48D7] hover:text-[#8637c3] font-semibold transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className={`relative flex items-center rounded-xl bg-slate-50 border transition-all duration-200 ${
                    isFocused.pass 
                      ? 'border-[#9B48D7] bg-white ring-4 ring-[#9B48D7]/15' 
                      : 'border-slate-300 hover:border-slate-400'
                  }`}>
                    <div className={`pl-3.5 transition-colors ${isFocused.pass ? 'text-[#9B48D7]' : 'text-slate-400'}`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="w-full py-2.5 px-3 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none font-medium pr-10"
                      placeholder="••••••••••••"
                      value={EmpId}
                      onChange={(e) => setEmpId(e.target.value)}
                      onFocus={() => setIsFocused(prev => ({ ...prev, pass: true }))}
                      onBlur={() => setIsFocused(prev => ({ ...prev, pass: false }))}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#9B48D7] focus:ring-[#9B48D7] accent-[#9B48D7] cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors">
                      Remember my email
                    </span>
                  </label>
                </div>

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-pink-shimmer relative w-full py-3 px-4 rounded-xl text-white font-bold text-sm bg-[#9B48D7] hover:bg-[#8637c3] shadow-lg shadow-[#9B48D7]/30 hover:shadow-[#9B48D7]/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <div className="shimmer-layer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"></div>

                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Login</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ============================================================
                VIEW 2: FORGOT / RESET PASSWORD FORM
                ============================================================ */}
            {isResetMode && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Email
                  </label>
                  <div className={`relative flex items-center rounded-xl bg-slate-50 border transition-all duration-200 ${
                    isFocused.resetEmail 
                      ? 'border-[#9B48D7] bg-white ring-4 ring-[#9B48D7]/15' 
                      : 'border-slate-300 hover:border-slate-400'
                  }`}>
                    <div className={`pl-3.5 transition-colors ${isFocused.resetEmail ? 'text-[#9B48D7]' : 'text-slate-400'}`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      autoComplete="email"
                      className="w-full py-2.5 px-3 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none font-medium"
                      placeholder="e.g. store@rootments.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      onFocus={() => setIsFocused(prev => ({ ...prev, resetEmail: true }))}
                      onBlur={() => setIsFocused(prev => ({ ...prev, resetEmail: false }))}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className={`relative flex items-center rounded-xl bg-slate-50 border transition-all duration-200 ${
                    isFocused.newPass 
                      ? 'border-[#9B48D7] bg-white ring-4 ring-[#9B48D7]/15' 
                      : 'border-slate-300 hover:border-slate-400'
                  }`}>
                    <div className={`pl-3.5 transition-colors ${isFocused.newPass ? 'text-[#9B48D7]' : 'text-slate-400'}`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="w-full py-2.5 px-3 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none font-medium pr-10"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setIsFocused(prev => ({ ...prev, newPass: true }))}
                      onBlur={() => setIsFocused(prev => ({ ...prev, newPass: false }))}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className={`relative flex items-center rounded-xl bg-slate-50 border transition-all duration-200 ${
                    isFocused.confirmPass 
                      ? 'border-[#9B48D7] bg-white ring-4 ring-[#9B48D7]/15' 
                      : 'border-slate-300 hover:border-slate-400'
                  }`}>
                    <div className={`pl-3.5 transition-colors ${isFocused.confirmPass ? 'text-[#9B48D7]' : 'text-slate-400'}`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="w-full py-2.5 px-3 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none font-medium pr-10"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setIsFocused(prev => ({ ...prev, confirmPass: true }))}
                      onBlur={() => setIsFocused(prev => ({ ...prev, confirmPass: false }))}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Reset Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    disabled={loading}
                    className="w-1/3 py-3 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-pink-shimmer relative flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm bg-[#9B48D7] hover:bg-[#8637c3] shadow-lg shadow-[#9B48D7]/30 hover:shadow-[#9B48D7]/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <div className="shimmer-layer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"></div>

                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Footer info */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Connected
              </span>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-slate-500 hover:text-[#9B48D7] transition-colors flex items-center gap-1 font-medium cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Need Help?</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          HELP & SUPPORT MODAL
          ============================================================ */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#9B48D7] border border-purple-200 flex items-center justify-center mb-3">
              <HelpCircle className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">Login Assistance</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              For account access issues or store branch permissions, please contact your administrator.
            </p>

            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">IT Desk:</span>
                <span className="font-mono text-[#9B48D7] font-semibold">admin@rootments.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Support Hours:</span>
                <span className="font-medium">10:00 AM – 9:00 PM</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-[#9B48D7] hover:bg-[#8637c3] text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-md shadow-[#9B48D7]/20"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;