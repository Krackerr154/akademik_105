"use client";

interface NavbarProps {
    userName?: string;
    userAvatar?: string;
    userRole?: string;
    showMenuButton?: boolean;
    onMenuClick?: () => void;
}

export function Navbar({
    userName,
    userAvatar,
    userRole,
    showMenuButton,
    onMenuClick,
}: NavbarProps) {
    return (
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-3 px-3 sm:px-4 md:px-6 bg-surface/80 backdrop-blur-md">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {showMenuButton && (
                    <button
                        type="button"
                        onClick={onMenuClick}
                        className="md:hidden w-10 h-10 rounded-md flex items-center justify-center text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high/50 transition-colors"
                        aria-label="Buka navigasi"
                    >
                        <MenuIcon className="w-5 h-5" />
                    </button>
                )}

                {/* Search */}
                <div className="hidden sm:block flex-1 max-w-lg min-w-0">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/40" />
                        <input
                            type="text"
                            placeholder="Cari arsip, mata kuliah, catatan"
                            className="w-full pl-9 pr-4 py-2 rounded-md bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none ghost-border focus:ghost-border-focus transition-shadow duration-150 appearance-none"
                        />
                    </div>
                </div>

                <button
                    type="button"
                    className="sm:hidden w-10 h-10 rounded-md flex items-center justify-center text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high/50 transition-colors"
                    aria-label="Cari"
                >
                    <SearchIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3">
                {/* Notifications */}
                <button
                    type="button"
                    className="w-10 h-10 rounded-md flex items-center justify-center text-on-surface/50 hover:text-on-surface hover:bg-surface-container-high/50 transition-colors"
                    aria-label="Notifikasi"
                >
                    <BellIcon className="w-4 h-4" />
                </button>

                {/* User */}
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center">
                        {userAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={userAvatar}
                                alt={userName ?? "User"}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-xs font-medium text-on-surface/60">
                                {userName?.charAt(0)?.toUpperCase() ?? "U"}
                            </span>
                        )}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium text-primary leading-tight">
                            {userName ?? "Pengguna"}
                        </p>
                        {userRole && (
                            <p className="text-xs text-on-surface/50 capitalize">
                                {userRole}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

function MenuIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function BellIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}
