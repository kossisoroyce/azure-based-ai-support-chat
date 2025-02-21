import { Link } from "wouter"

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/50 backdrop-blur-sm flex justify-between items-center text-sm">
      <div className="text-gray-400">
        © {currentYear} AI Support. All rights reserved.
      </div>
      <div className="flex gap-4">
        <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
          Terms of Use
        </Link>
        <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
          Privacy Policy
        </Link>
      </div>
    </footer>
  )
}
