import { signIn } from "@/lib/auth";

export default function LoginPage({
    searchParams,
}: {
    searchParams: { callbackUrl?: string };
}) {
    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / Header Area */}
                <div className="mb-8 md:mb-10 text-center space-y-3">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-medium text-primary tracking-tight">Akademik 105</h1>
                    <p className="text-on-surface-variant text-sm tracking-widest uppercase font-mono">The Digital Archive</p>
                </div>

                {/* Login Card (Surface Container Lowest) */}
                <div className="bg-surface-container-lowest p-6 sm:p-8 md:p-10 shadow-ambient relative overflow-hidden">
                    {/* Ghost border via CSS classes or pseudo-element since border radius is 0 */}
                    <div className="absolute inset-0 ring-1 ring-inset ring-outline-variant/15 pointer-events-none"></div>

                    <div className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <h2 className="text-xl font-display font-medium text-primary">Autentikasi</h2>
                            <p className="text-sm text-on-surface-variant/80">Silakan masuk menggunakan akun Google ITB atau email yang telah terdaftar pada database sistem.</p>
                        </div>

                        <form
                            action={async () => {
                                "use server";
                                await signIn("google", { redirectTo: searchParams.callbackUrl || "/" });
                            }}
                        >
                            <button
                                type="submit"
                                className="w-full group relative overflow-hidden bg-surface-container-low hover:bg-surface-container transition-colors py-3 px-4 flex items-center justify-center gap-3 mt-6"
                            >
                                <div className="absolute inset-0 ring-1 ring-inset ring-outline-variant/20 group-hover:ring-outline-variant/40 transition-colors pointer-events-none"></div>
                                {/* Google Icon */}
                                <svg className="w-5 h-5 text-on-surface" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="text-sm font-sans font-medium text-on-surface tracking-wide group-hover:text-primary transition-colors">Masuk dengan Google</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer Notes */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-on-surface/40 font-sans tracking-wide">
                        Sistem Informasi Arsip Terpusat
                    </p>
                </div>
            </div>
        </div>
    );
}
