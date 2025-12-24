"use client";

import { useEffect, useState } from "react";
import { NetworkQuality, ReconnectionState } from "@/lib/peer/PlayerPeer";

interface ConnectionStatusProps {
  networkQuality: NetworkQuality;
  latency: number;
  reconnectionState?: ReconnectionState;
  onRetry?: () => void;
  className?: string;
}

export function ConnectionStatus({
  networkQuality,
  latency,
  reconnectionState,
  onRetry,
  className = "",
}: ConnectionStatusProps) {
  const [showReconnectionOverlay, setShowReconnectionOverlay] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Show overlay when reconnecting
  useEffect(() => {
    if (reconnectionState?.isReconnecting) {
      setShowReconnectionOverlay(true);
      setShowSuccessMessage(false);
    } else if (showReconnectionOverlay && !reconnectionState?.isReconnecting) {
      // Reconnection successful
      setShowReconnectionOverlay(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  }, [reconnectionState?.isReconnecting, showReconnectionOverlay]);

  const getQualityIcon = () => {
    switch (networkQuality) {
      case "excellent":
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
          </svg>
        );
      case "good":
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
          </svg>
        );
      case "poor":
        return (
          <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0z"/>
          </svg>
        );
      case "offline":
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 0L0 24l2.83 2.83L24 5.66z"/>
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9z" opacity="0.3"/>
          </svg>
        );
    }
  };

  const getQualityText = () => {
    if (networkQuality === "offline") return "Offline";
    return `${latency}ms`;
  };

  const getQualityColor = () => {
    switch (networkQuality) {
      case "excellent":
        return "text-green-500";
      case "good":
        return "text-yellow-500";
      case "poor":
        return "text-orange-500";
      case "offline":
        return "text-red-500";
    }
  };

  return (
    <>
      {/* Connection Quality Indicator */}
      <div className={`flex items-center gap-2 ${className}`}>
        {getQualityIcon()}
        <span className={`text-sm font-medium ${getQualityColor()}`}>
          {getQualityText()}
        </span>
      </div>

      {/* Reconnection Overlay */}
      {showReconnectionOverlay && reconnectionState && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-8 max-w-md mx-4 text-center">
            {/* Animated spinner */}
            <div className="mb-4 flex justify-center">
              <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
            </div>

            {/* Reconnection status */}
            <h3 className="text-xl font-bold mb-2">
              {reconnectionState.attempt === 1
                ? "Connection lost"
                : "Reconnecting..."}
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              {reconnectionState.attempt === 1
                ? "Attempting to reconnect to the game..."
                : `Attempt ${reconnectionState.attempt} of ${reconnectionState.maxAttempts}`}
            </p>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-300"
                style={{
                  width: `${(reconnectionState.attempt / reconnectionState.maxAttempts) * 100}%`,
                }}
              />
            </div>

            {/* Manual retry button */}
            {reconnectionState.attempt > 3 && onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg font-medium transition-colors"
              >
                Retry Now
              </button>
            )}

            {/* Info text */}
            <p className="text-sm text-[var(--text-secondary)] mt-4">
              {reconnectionState.attempt >= reconnectionState.maxAttempts
                ? "Maximum attempts reached. Please check your connection."
                : "Please wait while we restore your connection..."}
            </p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-green-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Connection restored!</span>
          </div>
        </div>
      )}
    </>
  );
}

interface ReconnectionOverlayProps {
  isVisible: boolean;
  attempt: number;
  maxAttempts: number;
  onRetry?: () => void;
}

export function ReconnectionOverlay({
  isVisible,
  attempt,
  maxAttempts,
  onRetry,
}: ReconnectionOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-8 max-w-md mx-4 text-center">
        <div className="mb-4 flex justify-center">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>

        <h3 className="text-xl font-bold mb-2">
          {attempt === 1 ? "Connection lost" : "Reconnecting..."}
        </h3>
        <p className="text-[var(--text-secondary)] mb-4">
          {attempt === 1
            ? "Attempting to reconnect to the game..."
            : `Attempt ${attempt} of ${maxAttempts}`}
        </p>

        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-300"
            style={{
              width: `${(attempt / maxAttempts) * 100}%`,
            }}
          />
        </div>

        {attempt > 3 && onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg font-medium transition-colors"
          >
            Retry Now
          </button>
        )}

        <p className="text-sm text-[var(--text-secondary)] mt-4">
          {attempt >= maxAttempts
            ? "Maximum attempts reached. Please check your connection."
            : "Please wait while we restore your connection..."}
        </p>
      </div>
    </div>
  );
}

interface ConnectionRestoredToastProps {
  isVisible: boolean;
}

export function ConnectionRestoredToast({ isVisible }: ConnectionRestoredToastProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="bg-green-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">Connection restored!</span>
      </div>
    </div>
  );
}
