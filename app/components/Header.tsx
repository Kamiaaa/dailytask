import Link from 'next/link'
export default function Header() {
    return (
        <header className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto w-full">
            <span className="font-display text-xl text-brass-500 tracking-tight">Daily Task</span>
            <nav className="flex gap-3">
                <Link href="/login" className="btn-secondary">
                    Log in
                </Link>
                <Link href="/docs" className="btn-primary">
                    Explore Docs
                </Link>
            </nav>
        </header>
    )
}
