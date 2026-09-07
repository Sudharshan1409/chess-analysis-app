"use client";

import React from "react";
import { Settings, BarChart2, Navigation, AlertTriangle, Cpu, Volume2, X } from "lucide-react";

export interface SettingsState {
  showEvalBar: boolean;
  showSuggestionArrows: boolean;
  showThreatArrows: boolean;
  showEngineLines: boolean;
  enableSounds: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  settings: SettingsState;
  onUpdateSettings: (newSettings: Partial<SettingsState>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  if (!isOpen) return null;

  const toggles: {
    key: keyof SettingsState;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "showEvalBar",
      label: "Evaluation Bar",
      description: "Show or hide the vertical evaluation score meter on the left edge of the board.",
      icon: <BarChart2 className="w-5 h-5 text-amber-400" />,
    },
    {
      key: "showSuggestionArrows",
      label: "Suggestion Arrows",
      description: "Show or hide the cyan arrow overlay indicating Stockfish's top recommended move.",
      icon: <Navigation className="w-5 h-5 text-cyan-400" />,
    },
    {
      key: "showThreatArrows",
      label: "Threat Arrows",
      description: "Show or hide red warning arrows highlighting immediate opponent threats.",
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
    },
    {
      key: "showEngineLines",
      label: "Engine Lines",
      description: "Show or hide the MultiPV analysis box displaying top move variations.",
      icon: <Cpu className="w-5 h-5 text-emerald-400" />,
    },
    {
      key: "enableSounds",
      label: "Sound Effects",
      description: "Enable or disable audio feedback for moves, captures, checks, and promotions.",
      icon: <Volume2 className="w-5 h-5 text-purple-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#262421] border border-[#3c3934] rounded-xl max-w-md w-full p-5 shadow-2xl text-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#3c3934] mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            Assistance Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#312e2b] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {toggles.map((item) => {
            const isChecked = settings[item.key];
            return (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 bg-[#1e1c18] p-3 rounded-lg border border-[#312e2b]"
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">{item.icon}</div>
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-400 block mt-0.5 leading-tight">
                      {item.description}
                    </span>
                  </div>
                </div>

                {/* Custom Toggle Switch */}
                <button
                  onClick={() =>
                    onUpdateSettings({ [item.key]: !isChecked })
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out shrink-0 mt-1 ${
                    isChecked ? "bg-emerald-500 justify-end" : "bg-gray-700 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-[#3c3934] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-lg text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
