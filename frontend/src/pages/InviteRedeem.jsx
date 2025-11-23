import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Film,
  Loader,
  Clock,
  Users,
} from "lucide-react";

const InviteRedeem = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteCode = searchParams.get("code");

  const [step, setStep] = useState("validating"); // validating, valid, redeemed, error
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [serverName, setServerName] = useState("Plex Server");

  useEffect(() => {
    if (inviteCode) {
      validateInvite();
    } else {
      setStep("error");
      setError("No invite code provided");
    }
  }, [inviteCode]);

  const validateInvite = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/invites/validate?code=${inviteCode}`);

      console.log("Validate response:", response);

      if (response.valid) {
        setInviteData(response.invite);
        setServerName(response.plex_server_name || "Plex Server");
        setStep("valid");
      } else {
        setStep("error");
        setError(response.message || "Invalid invite code");
      }
    } catch (err) {
      console.error("Validation error:", err);
      console.error("Error response:", err.response);
      setStep("error");
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to validate invite code"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post("/invites/redeem", {
        code: inviteCode,
        email: email,
      });

      setStep("redeemed");
    } catch (err) {
      setError(
        err.response?.data?.detail || err.message || "Failed to redeem invite"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Validating state
  if (step === "validating") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          <Loader className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Validating Invite
          </h2>
          <p className="text-gray-400">Please wait...</p>
        </div>
      </div>
    );
  }

  // Error state (expired, exhausted, disabled, or not found)
  if (step === "error") {
    const isExpired = error?.toLowerCase().includes("expired");
    const isExhausted = error?.toLowerCase().includes("usage limit");
    const isDisabled = error?.toLowerCase().includes("disabled");

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Invite Not Available
            </h2>

            <p className="text-gray-300 mb-6">{error}</p>

            {(isExpired || isExhausted || isDisabled) && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-300">
                    {isExpired && (
                      <p>
                        This invite code has expired. Please contact the person
                        who sent you this link to request a new invite.
                      </p>
                    )}
                    {isExhausted && (
                      <p>
                        This invite code has reached its maximum usage limit.
                        Please contact the person who sent you this link to
                        request a new invite.
                      </p>
                    )}
                    {isDisabled && (
                      <p>
                        This invite code has been disabled. Please contact the
                        person who sent you this link for assistance.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => (window.location.href = "https://www.plex.tv")}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Go to Plex
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redeemed successfully
  if (step === "redeemed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Invitation Accepted!
            </h2>

            <p className="text-gray-300 mb-6">
              You've been successfully invited to{" "}
              <span className="font-semibold text-white">{serverName}</span>.
            </p>

            <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-left space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Email:</span>
                <span className="text-white font-medium">{email}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Film className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Server:</span>
                <span className="text-white font-medium">{serverName}</span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-300">
                <strong>Next Steps:</strong>
                <br />
                Check your email for an invitation from Plex. You may need to
                create a Plex account if you don't have one.
              </p>
            </div>

            <button
              onClick={() => (window.location.href = "https://www.plex.tv")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Go to Plex
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Valid invite - show redemption form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <Film className="w-12 h-12 text-blue-500" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            You're Invited!
          </h2>

          <p className="text-gray-300">
            Join <span className="font-semibold text-white">{serverName}</span>
          </p>
        </div>

        {inviteData && (
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6 space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Expires:
              </span>
              <span className="text-white font-medium">
                {inviteData.expires_at
                  ? formatDate(inviteData.expires_at)
                  : "Never"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usage:
              </span>
              <span className="text-white font-medium">
                {inviteData.used_count} /{" "}
                {inviteData.usage_limit || "Unlimited"}
              </span>
            </div>

            {inviteData.libraries && inviteData.libraries !== "all" && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Libraries:</span>
                <span className="text-white font-medium">
                  {inviteData.libraries}
                </span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleRedeem} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Redeeming...
              </>
            ) : (
              "Accept Invitation"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InviteRedeem;
