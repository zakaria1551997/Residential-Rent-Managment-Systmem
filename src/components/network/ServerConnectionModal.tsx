import React, { useState } from 'react';
import { Network, Server, Wifi, CheckCircle2, AlertCircle, RefreshCw, Terminal, Monitor } from 'lucide-react';
import { networkService, type NetworkConfig } from '../../services/network.ts';
import { toBanglaNumber } from '../../logic/rules.ts';
import { Modal } from '../common/Modal.tsx';

interface ServerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const ServerConnectionModal: React.FC<ServerConnectionModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const currentConfig = networkService.getConfig();
  const [host, setHost] = useState(currentConfig.serverHost);
  const [port, setPort] = useState(currentConfig.serverPort);
  const [mode, setMode] = useState(currentConfig.mode);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await networkService.testServerConnection(host, port);
    setTesting(false);
    setTestResult(result);
  };

  const handleSave = () => {
    networkService.saveConfig({
      serverHost: host,
      serverPort: Number(port),
      mode,
      isOnline: testResult ? testResult.success : true
    });
    onConfigUpdated();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="কেন্দ্রীয় সার্ভার ও ল্যান নেটওয়ার্ক কনফিগারেশন (Central LAN Server Connection)"
      subtitle="শহীদ সৈয়দ নজরুল ইসলাম মেডিকেল কলেজ হাসপাতাল, কিশোরগঞ্জ"
      maxWidth="xl"
    >
      <div className="space-y-5 text-xs text-slate-700">
        {/* Status banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          currentConfig.isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${currentConfig.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <div>
              <p className="font-bold text-sm">
                {currentConfig.isOnline ? 'কেন্দ্রীয় সার্ভার সংযোগ সক্রিয় (Connected)' : 'সার্ভার সংযোগ বিচ্ছিন্ন (Offline)'}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                হোস্ট: {currentConfig.serverHost}:{currentConfig.serverPort} • লেটেন্সি: {toBanglaNumber(currentConfig.lastPingMs)}ms
              </p>
            </div>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-teal-600' : ''}`} />
            <span>পিং পরীক্ষা</span>
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Server IP & Port settings */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block font-semibold text-slate-800 mb-1">কেন্দ্রীয় সার্ভার আইপি / হোস্টনেম (Server IP) *</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="যেমন: 192.168.1.100 অথবা hospital-server.lan"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">পোর্ট (Port) *</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="3000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono text-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-800 mb-1">অপারেটিং মোড</label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 ${
              mode === 'CENTRAL_SERVER_LAN' ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold' : 'bg-white border-slate-200'
            }`}>
              <input
                type="radio"
                name="net_mode"
                checked={mode === 'CENTRAL_SERVER_LAN'}
                onChange={() => setMode('CENTRAL_SERVER_LAN')}
                className="w-4 h-4 text-teal-600"
              />
              <div>
                <span>কেন্দ্রীয় ল্যান সার্ভার মোড</span>
                <p className="text-[10px] text-slate-500 font-normal">অন্যান্য কম্পিউটারের সাথে কেন্দ্রীয় ডাটাবেজে শেয়ার</p>
              </div>
            </label>

            <label className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 ${
              mode === 'STANDALONE_LOCAL' ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold' : 'bg-white border-slate-200'
            }`}>
              <input
                type="radio"
                name="net_mode"
                checked={mode === 'STANDALONE_LOCAL'}
                onChange={() => setMode('STANDALONE_LOCAL')}
                className="w-4 h-4 text-teal-600"
              />
              <div>
                <span>একক পিসি মোড (Standalone)</span>
                <p className="text-[10px] text-slate-500 font-normal">একক অফলাইন মেশিনে লোকাল ডাটাবেজ সংরক্ষণ</p>
              </div>
            </label>
          </div>
        </div>

        {/* Hospital Multi-PC Deployment Guide */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Monitor className="w-4 h-4 text-teal-700" />
            <span>হাসপাতাল ল্যান (LAN) নেটওয়ার্ক নির্দেশিকা</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
            <li>হাসপাতালের প্রশাসন শাখায় ১টি কম্পিউটারকে মূল সার্ভার (Host) হিসেবে নির্বাচন করুন।</li>
            <li>কমান্ড প্রম্পট (cmd) এ গিয়ে <code className="bg-slate-200 px-1 rounded font-mono">ipconfig</code> দিয়ে সার্ভার আইপিটি দেখে নিন (যেমন: 192.168.1.100)।</li>
            <li>বাকি সকল কর্মকর্তা ও পরিচালকের কম্পিউটারে এই অ্যাপ চালু করে উপরে সেই আইপিটি প্রদান করুন।</li>
            <li>এর ফলে একাধিক কম্পিউটার থেকে একই সাথে একই কেন্দ্রীয় তথ্যে কাজ করা যাবে কোনো ইন্টারনেট সংযোগ ছাড়াই।</li>
          </ol>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-xs"
          >
            কনফিগারেশন সংরক্ষণ
          </button>
        </div>
      </div>
    </Modal>
  );
};
