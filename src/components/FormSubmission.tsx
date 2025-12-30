import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Check, Mail, Briefcase, FileText, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function FormSubmission({ clerkId }: { clerkId?: string }) {
  const [email, setEmail] = useState("");
  const [jobType, setJobType] = useState("");
  const [useCase, setUseCase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitForm = useMutation(api.formSubmissions.submitForm);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !jobType.trim() || !useCase.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitForm({
        email: email.trim(),
        jobType: jobType.trim(),
        useCase: useCase.trim(),
        clerkId: clerkId,
      });

      if (result.success) {
        if (result.accessGranted && clerkId) {
          // User is logged in and got access - redirect to chat
          toast.success("Access granted! You now have unlimited messages. Redirecting to chat...", { duration: 3000 });
          setTimeout(() => {
            navigate("/chat");
          }, 1500);
        } else {
          // Not logged in or access not granted yet
          toast.success("Form submitted successfully! You'll receive an email confirmation shortly.");
          // Reset form
          setEmail("");
          setJobType("");
          setUseCase("");
        }
      } else {
        toast.error("Failed to submit form. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-md">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-4">
          <FileText className="h-8 w-8 text-accent" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
          Request Access
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {clerkId 
            ? "Fill out this form to get unlimited messages instantly!" 
            : "Tell us about your use case and get unlimited access"}
        </p>
        {clerkId && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-accent font-semibold">
            <Zap className="h-4 w-4" />
            <span>Access granted immediately after submission</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <Mail className="h-4 w-4 inline mr-2" />
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="jobType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <Briefcase className="h-4 w-4 inline mr-2" />
            Job Type / Role
          </label>
          <input
            type="text"
            id="jobType"
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="e.g., Real Estate Investor, Contractor, Developer"
          />
        </div>

        <div>
          <label htmlFor="useCase" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            What do you plan to use this for? / What features do you need?
          </label>
          <textarea
            id="useCase"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
            placeholder="Tell us about your use case, what features you need, or how you plan to use the platform..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-accent text-white py-4 px-6 rounded-full font-bold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin">⏳</span>
              Submitting...
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              Submit Request
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        {clerkId 
          ? "You'll get unlimited messages immediately. We'll also send you an email confirmation."
          : "We'll review your request and email you within 24-48 hours"}
      </p>
    </div>
  );
}

