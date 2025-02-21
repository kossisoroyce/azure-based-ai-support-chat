import { Header } from "@/components/ui/header"
import { Footer } from "@/components/ui/footer"

export default function Terms() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-24">
        <h1 className="text-4xl font-bold mb-8">Terms of Use</h1>
        <div className="prose prose-invert">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using this AI Support service, you acknowledge that you have read,
            understood, and agree to be bound by these Terms of Use.
          </p>

          <h2>2. Use of Service</h2>
          <p>
            Our AI Support service is designed to provide automated customer support assistance.
            You agree to use this service responsibly and in accordance with all applicable laws
            and regulations.
          </p>

          <h2>3. Privacy</h2>
          <p>
            Your use of our service is also governed by our Privacy Policy. Please review our
            Privacy Policy to understand how we collect, use, and protect your information.
          </p>

          <h2>4. Limitations</h2>
          <p>
            While we strive to provide accurate and helpful information, our AI service may not
            always provide perfect responses. Users should exercise judgment when acting on AI-generated advice.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
