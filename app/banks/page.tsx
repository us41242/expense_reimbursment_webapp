"use client";

import { Building2, Landmark, Lock, ShieldCheck, CreditCard, Plus, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function BanksPage() {
  const [isLinking, setIsLinking] = useState(false);

  const handleLinkBank = () => {
    setIsLinking(true);
    // Simulate Teller integration opening
    setTimeout(() => {
      alert("Teller.io Connect modal would open here to securely link your institution.");
      setIsLinking(false);
    }, 1500);
  };

  const connectedBanks = [
    { id: 1, name: "Chase Bank", type: "Checking", last4: "4092", balance: 4250.00, color: "bg-blue-600" },
    { id: 2, name: "Citibank", type: "Credit Card", last4: "8821", balance: -340.50, color: "bg-cyan-600" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 md:text-5xl border-b-[6px] border-emerald-500 pb-2 inline-block">
            Bank Accounts
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400 text-lg">
            Securely link and manage your financial institutions for automated expense tracking.
          </p>
        </div>
        <button
          onClick={handleLinkBank}
          disabled={isLinking}
          className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-4 text-base font-bold text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 hover:shadow-emerald-500/40 active:scale-95 disabled:opacity-70 disabled:scale-100"
        >
          {isLinking ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
             <>
              <Plus className="h-5 w-5" />
              <span>Link New Account</span>
            </>
          )}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
        {/* Existing Accounts Cards */}
        {connectedBanks.map((bank) => (
          <div
            key={bank.id}
            className="group relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/60 p-6 shadow-xl backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-zinc-900/80"
          >
            <div className={`absolute top-0 right-0 h-32 w-32 -translate-y-12 translate-x-12 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${bank.color}`} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bank.color} text-white shadow-inner`}>
                  {bank.type === 'Credit Card' ? <CreditCard className="h-7 w-7" /> : <Landmark className="h-7 w-7" />}
                </div>
                <div className="flex items-center gap-2 rounded-full bg-emerald-100/60 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 duration-1000"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  Connected
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{bank.name}</h3>
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                  {bank.type} •••• {bank.last4}
                </p>
              </div>
              
              <div className="mt-8 border-t border-zinc-200/60 pt-5 dark:border-white/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Current Balance</p>
                <p className="mt-1 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  {bank.balance < 0 ? "-" : ""}${Math.abs(bank.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Connect New Card */}
        <div
          onClick={handleLinkBank}
          className="group relative flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-[2rem] border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-900/10"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg dark:bg-zinc-800 group-hover:scale-110 transition-transform duration-300">
            <Building2 className="h-8 w-8 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Add Institution</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 px-4">Connect a new bank or credit card securely via Teller.io</p>
          </div>
          <ArrowRight className="absolute bottom-6 right-6 h-6 w-6 text-zinc-400 opacity-0 -translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
        </div>
      </div>

      {/* Security Info */}
      <div className="mt-16 overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white/60 backdrop-blur-xl shadow-xl dark:border-white/5 dark:bg-zinc-900/50">
        <div className="px-6 py-10 md:px-12 md:py-16 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6 shadow-inner">
            <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mb-4">Bank-Grade Security</h2>
          <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 pb-8 leading-relaxed">
            Your credentials are never stored on our servers. We use Teller.io, an industry leader with AES-256 encryption, to establish a secure, read-only connection to your accounts.
          </p>
          <div className="flex items-center gap-3 text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-5 py-3 rounded-full border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
            <Lock className="h-4 w-4" />
            <span>Read-only access. We cannot move your money.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
