export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-white/40">404</h1>
        <p className="text-xl text-white/70 mt-4">Page not found</p>
        <a href="/" className="mt-6 inline-block text-primary-300 hover:text-primary-200">
          Go back home
        </a>
      </div>
    </div>
  )
}
