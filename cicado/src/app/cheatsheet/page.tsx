"use client";

export default function CheatSheetPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-16 px-4">
      <div className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-primary mb-6 text-center">Cybersecurity Roadmap</h1>
        <p className="text-muted-foreground mb-10 text-center text-lg">A curated roadmap for aspiring cybersecurity professionals. Start from your level and progress to mastery!</p>
        <div className="space-y-10">
          {/* Beginner Section */}
          <section>
            <h2 className="text-2xl font-bold text-green-400 mb-3">Beginner</h2>
            <ul className="list-disc list-inside text-foreground space-y-1">
              <li>Basic Computer Networking (OSI Model, TCP/IP, DNS, HTTP/HTTPS)</li>
              <li>Linux & Windows Fundamentals</li>
              <li>Command Line Basics (Bash, PowerShell)</li>
              <li>Introduction to Cybersecurity Concepts</li>
              <li>Common Threats: Malware, Phishing, Social Engineering</li>
              <li>Setting up a Home Lab (VirtualBox, VMs)</li>
              <li>Using Security Tools: Nmap, Wireshark, Burp Suite (Community)</li>
              <li>Online Platforms: TryHackMe, Hack The Box (Beginner rooms)</li>
              <li>Basic Scripting (Python, Bash)</li>
            </ul>
          </section>
          {/* Intermediate Section */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-3">Intermediate</h2>
            <ul className="list-disc list-inside text-foreground space-y-1">
              <li>Web Application Security (OWASP Top 10, XSS, SQLi, CSRF, SSRF)</li>
              <li>Network Security (Firewalls, IDS/IPS, VPNs)</li>
              <li>Active Directory & Windows Privilege Escalation</li>
              <li>Linux Privilege Escalation</li>
              <li>Penetration Testing Methodologies</li>
              <li>CTFs & Real-World Labs (Hack The Box, TryHackMe Intermediate/Pro)</li>
              <li>Writing Exploits & Payloads (Python, Bash, PowerShell)</li>
              <li>Reverse Engineering Basics</li>
              <li>Basic Cryptography (Hashing, Encryption, Steganography)</li>
            </ul>
          </section>
          {/* Advanced Section */}
          <section>
            <h2 className="text-2xl font-bold text-red-400 mb-3">Advanced</h2>
            <ul className="list-disc list-inside text-foreground space-y-1">
              <li>Advanced Exploit Development (Buffer Overflows, ROP, Shellcoding)</li>
              <li>Malware Analysis & Threat Hunting</li>
              <li>Red Teaming & Adversary Simulation</li>
              <li>Blue Teaming (SIEM, Incident Response, Forensics)</li>
              <li>Cloud Security (AWS, Azure, GCP)</li>
              <li>Web & Binary Exploitation (CTFs, Real-World Challenges)</li>
              <li>Security Research & Bug Bounties</li>
              <li>Contributing to Open Source Security Tools</li>
              <li>Staying Updated: Conferences, Blogs, Twitter, Research Papers</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
} 