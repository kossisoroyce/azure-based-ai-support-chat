import { Header } from "@/components/ui/header"
import { Footer } from "@/components/ui/footer"

export default function Privacy() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-24">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-invert">
          <h2>1. Information We Collect</h2>
          <p>
            We collect information that you provide directly to us when using our AI Support
            service, including chat messages and any uploaded files.
          </p>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to provide and improve our AI Support service,
            to train our AI models, and to enhance your user experience.
          </p>

          <h2>3. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your
            personal information against unauthorized access, alteration, or destruction.
          </p>

          <h2>4. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal information.
            Contact us if you wish to exercise these rights.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
