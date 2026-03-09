import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function NotFoundPage() {
    return (
        <div className="min-h-screen pb-20">
            <Navbar />
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-fade-in">
                <h1 className="text-9xl font-bold text-white/10 mb-4">404</h1>
                <h2 className="text-3xl font-bold text-white mb-4">Page Not Found</h2>
                <p className="text-gray-400 mb-8 max-w-md">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>
                <Link to="/" className="btn-primary">
                    Back to Home
                </Link>
            </div>
        </div>
    )
}
