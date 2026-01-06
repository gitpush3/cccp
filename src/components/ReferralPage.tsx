import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Copy, Check, ExternalLink, DollarSign, Users, Award, Landmark, Download } from "lucide-react";
import { toast } from "sonner";
import { QRCode } from "./QRCode";

export default function ReferralPage() {
  const user = useQuery(api.users.getCurrentUser);
  const referralCount = useQuery(api.users.getReferralCount, user?.referralCode ? { referralCode: user.referralCode } : "skip");
  const commissions = useQuery(api.stripe.getUserCommissions, user?._id ? { userId: user._id } : "skip");
  const createStripeAccountLink = useAction(api.stripe.createStripeAccountLink);
  const [isCopying, setIsCopying] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const referralLink = user?.referralCode 
    ? `${window.location.origin}/join?ref=${user.referralCode}`
    : "";

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setIsCopying(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setIsCopying(false), 2000);
  };

  const handleLinkStripe = async () => {
    if (!user) return;
    setIsLinking(true);
    try {
      const { url } = await createStripeAccountLink({ userId: user._id });
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error linking Stripe:", error);
      toast.error("Failed to start Stripe onboarding. Please try again.");
    } finally {
      setIsLinking(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500">Loading your referral dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Please sign in to access referrals.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-primary dark:text-white mb-2 tracking-tight">
          Referral Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Share the love and earn 1% of gross revenue from everyone you refer.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Earnings Card */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-accent">
            <DollarSign className="h-6 w-6" />
            <h3 className="font-bold text-gray-900 dark:text-white">Total Earnings</h3>
          </div>
          <p className="text-3xl font-black text-primary dark:text-white">
            ${((user.totalReferralEarnings || 0) / 100).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">1% of referred gross revenue</p>
        </div>

        {/* Referrals Count Card */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-primary dark:text-accent">
            <Users className="h-6 w-6" />
            <h3 className="font-bold text-gray-900 dark:text-white">Friends Referred</h3>
          </div>
          <p className="text-3xl font-black text-primary dark:text-white">
            {referralCount !== undefined ? referralCount : "--"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Active referrals using your code</p>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-yellow-500">
            <Award className="h-6 w-6" />
            <h3 className="font-bold text-gray-900 dark:text-white">Account Status</h3>
          </div>
          <p className="text-lg font-bold text-primary dark:text-white">
            {user.stripeAccountId ? "Linked to Stripe" : "Awaiting Payout Info"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {user.stripeAccountId ? "Auto ACH enabled" : "Link Stripe to get paid"}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Referral Link Section */}
        <div className="bg-primary text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4">Your Referral Link</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-4 py-3 font-mono text-sm truncate">
                  {referralLink}
                </div>
                <button
                  onClick={handleCopy}
                  className="bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                >
                  {isCopying ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {isCopying ? "Copied!" : "Copy Link"}
                </button>
              </div>
              <p className="mt-4 text-sm opacity-80">
                When someone signs up using this link, you'll earn 1% of everything they spend on the platform.
              </p>
            </div>
            
            {/* QR Code */}
            {referralLink && (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-3 rounded-xl shadow-lg">
                  <QRCode value={referralLink} size={150} />
                </div>
                <p className="text-xs opacity-70">Scan to share</p>
              </div>
            )}
          </div>
          {/* Background decoration */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-3xl"></div>
        </div>

        {/* Payout Section */}
        <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Landmark className="h-6 w-6 text-primary dark:text-accent" />
                Payout Settings
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We use Stripe Connect to pay out your commissions directly to your bank account via ACH. 
                It's secure, fast, and automatic.
              </p>
              
              {user.stripeAccountId ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg w-fit">
                    <Check className="h-5 w-5" />
                    Your account is linked and ready for payouts.
                  </div>
                  <a 
                    href="https://dashboard.stripe.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary dark:text-accent hover:underline flex items-center gap-1"
                  >
                    View Stripe Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <button
                  onClick={handleLinkStripe}
                  disabled={isLinking}
                  className="flex items-center gap-2 bg-primary dark:bg-accent text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isLinking ? "Redirecting..." : "Link Stripe for Payouts"}
                  {!isLinking && <ExternalLink className="h-4 w-4" />}
                </button>
              )}
            </div>
            
            <div className="w-full md:w-64 bg-gray-50 dark:bg-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <h4 className="font-bold text-sm mb-2 text-gray-900 dark:text-white">How it works:</h4>
              <ul className="text-xs space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex gap-2">
                  <span className="text-primary dark:text-accent font-bold">1.</span>
                  Share your link with friends or on social media.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary dark:text-accent font-bold">2.</span>
                  They sign up and purchase Pro or property data.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary dark:text-accent font-bold">3.</span>
                  1% of the gross sale is added to your balance.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary dark:text-accent font-bold">4.</span>
                  Commissions are paid out automatically via ACH.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Commission History */}
        {commissions && commissions.length > 0 && (
          <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              Commission History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 font-medium">
                    <th className="pb-4">Date</th>
                    <th className="pb-4 text-right">Amount</th>
                    <th className="pb-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                  {commissions.map((comm) => (
                    <tr key={comm._id} className="text-gray-900 dark:text-gray-200">
                      <td className="py-4">
                        {new Date(comm.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-right font-bold">
                        ${(comm.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-4 text-right">
                        <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          comm.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          comm.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {comm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
