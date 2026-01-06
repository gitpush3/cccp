import { Plane, Users, Shield, Globe, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function About() {
  const team = [
    { name: "Walter Krych", role: "Founder & CEO" },
    { name: "Penny Krych", role: "Director of Operations" },
    { name: "Ben Wallace", role: "Interim CTO" },
    { name: "Justin Rienhard", role: "Relationship Manager" },
    { name: "Mike Purcell", role: "Marketing" },
    { name: "Kevin Hiser", role: "Technical Advisor" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link 
        to="/" 
        className="inline-flex items-center space-x-2 text-gray-400 hover:text-brand-cyan transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="glass-card p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-cyan/30 blur-2xl rounded-full scale-150"></div>
              <Plane className="h-16 w-16 text-brand-cyan relative z-10" />
              <Sparkles className="h-8 w-8 text-brand-purple absolute -top-2 -right-2 z-10" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gradient-brand mb-4">
            About LatitudeGo
          </h1>
          <p className="text-xl text-gray-300">
            Revolutionizing Private Air Travel
          </p>
        </div>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <p>
            At LatitudeGo, we're fueled by our passion for travel and aviation and aim to provide 
            an all-inclusive, luxurious, and personalized private charter flight experience. With 
            access to thousands of private charter flights, we offer unmatched choice, flexibility, 
            and payment options to all of our clients.
          </p>
          <p>
            We serve our broker and travel advisor partners by providing an affordable and convenient 
            way to book private charter flights while enhancing our air carrier partners' sales and 
            utilization.
          </p>
          <p>
            LatitudeGo is committed to making private jet travel accessible and transparent, without 
            compromising on luxury and exclusivity. Join LatitudeGo on this exciting journey and 
            explore the world of private aviation today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-brand-cyan/10">
              <Globe className="h-8 w-8 text-brand-cyan" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Global Access</h3>
          <p className="text-gray-400 text-sm">
            Thousands of private charter flights available worldwide
          </p>
        </div>

        <div className="glass-card p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-brand-purple/10">
              <Shield className="h-8 w-8 text-brand-purple" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Transparent Pricing</h3>
          <p className="text-gray-400 text-sm">
            No hidden fees, flexible payment options for every budget
          </p>
        </div>

        <div className="glass-card p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-brand-violet/10">
              <Sparkles className="h-8 w-8 text-brand-violet" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Luxury Experience</h3>
          <p className="text-gray-400 text-sm">
            Personalized service without compromising on exclusivity
          </p>
        </div>
      </div>

      <div className="glass-card p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-lg bg-brand-purple/10">
            <Users className="h-5 w-5 text-brand-purple" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Our Team</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {team.map((member) => (
            <div 
              key={member.name} 
              className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-brand-cyan/20 transition-colors"
            >
              <p className="text-white font-medium">{member.name}</p>
              <p className="text-gray-500 text-sm">{member.role}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <a 
          href="https://latitudego.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-brand inline-flex items-center space-x-2"
        >
          <span>Visit LatitudeGo.com</span>
          <Globe className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
