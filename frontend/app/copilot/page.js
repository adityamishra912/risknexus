'use client';

import React, { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils/formatCurrency';
import { askCopilot } from '../../lib/api/copilot';
import { Bot, Send, Sparkles, ArrowRight, ShieldAlert, GitFork, Server, CheckCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function CopilotPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Estimated annual loss increased by ₹18L because a newly exploited critical vulnerability (CVE-2024-3094) affects the internet-facing Payment Gateway API (PAY-API-01). This creates an additional active attack path directly to the Customer Database Cluster.',
      metrics: {
        primaryContributor: 'CVE-2024-3094',
        asset: 'PAY-API-01 (Payment Gateway API)',
        additionalExposure: 1800000,
        currentEAL: 16000000,
      },
      affectedAssets: ['PAY-API-01', 'CUST-DB-02', 'AUTH-ID-01'],
      attackPaths: ['Internet → Web Server → Payment API → Identity Server → Customer Database'],
      assumptions: 'Poisson threat frequency = 0.20/yr, Single event loss magnitude = ₹1.00 Cr, MFA protection = Partial (62%)',
      recommendedAction: 'Apply emergency security patch on PAY-API-01 within 14 days and enforce hardware FIDO2 MFA.',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const suggestedQuestions = [
    'What is our highest financial cyber risk today?',
    'Why did risk increase this week?',
    'Which vulnerabilities contribute most to EAL?',
    'What happens if we delay remediation by 30 days?',
    'Why is MFA recommended?',
    'Which investment gives the highest ROSI?',
    'What risks affect our payment services?',
  ];

  const handleSend = async (textToSend) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isSending) return;

    const history = messages.map((message) => ({
      role: message.sender === 'assistant' ? 'assistant' : 'user',
      content: message.text,
    }));
    const newMsg = { sender: 'user', text: query };
    setMessages(prev => [...prev, newMsg]);
    setInputQuery('');
    setError(null);
    setIsSending(true);

    try {
      const response = await askCopilot(query, history);
      setMessages(prev => [...prev, { sender: 'assistant', text: response.answer }]);
    } catch (requestError) {
      setError(requestError.message || 'The assistant could not answer right now.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <PageContainer
      title="Cyber Risk Copilot"
      subtitle="Enterprise analytical assistant translating technical vulnerabilities into executive financial intelligence"
    >
      <div className="space-y-6">
        {/* Suggested Prompts Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs text-slate-400 font-semibold shrink-0">Suggested Queries:</span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-white shrink-0 transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Conversation Area */}
        <Card className="min-h-[500px] flex flex-col justify-between">
          <div className="space-y-4 overflow-y-auto max-h-[550px] pr-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs space-y-3 ${
                    msg.sender === 'user'
                      ? 'bg-cyan-600 text-white font-medium self-end rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-xl'
                  }`}
                >
                  <p className="leading-relaxed text-xs">{msg.text}</p>

                  {/* Structured Analytical Metadata Block */}
                  {msg.metrics && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3">
                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Primary Risk Contributor</span>
                          <span className="font-bold text-amber-400">{msg.metrics.primaryContributor}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Exposure Delta</span>
                          <span className="font-bold text-red-400">{formatCurrency(msg.metrics.additionalExposure)}</span>
                        </div>
                      </div>

                      {/* Affected Attack Paths */}
                      {msg.attackPaths && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase font-mono">Affected Attack Path:</span>
                          <div className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-cyan-300">
                            {msg.attackPaths[0]}
                          </div>
                        </div>
                      )}

                      {/* Model Assumptions */}
                      {msg.assumptions && (
                        <div className="text-[10px] text-slate-400 italic font-mono">
                          Model Assumptions: {msg.assumptions}
                        </div>
                      )}

                      {/* Recommended Action & Button */}
                      {msg.recommendedAction && (
                        <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{msg.recommendedAction}</span>
                          </div>
                          <Link href="/risk">
                            <Button variant="primary" size="sm" className="px-2 py-0.5 text-[10px] whitespace-nowrap">
                              View Risk Drivers
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-xs font-bold text-cyan-300 shrink-0 mt-1">
                    RM
                  </div>
                )}
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <span>Analyzing the current risk context...</span>
              </div>
            )}
            {error && (
              <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {/* Input Text Box */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isSending}
              placeholder="Ask Copilot anything about financial risk, attack paths, or investment trade-offs..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <Button onClick={() => handleSend()} variant="primary" size="md" className="rounded-xl px-4" disabled={isSending}>
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
