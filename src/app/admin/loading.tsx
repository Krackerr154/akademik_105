export default function AdminLoading() {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-sm text-on-surface/50">Memuat panel admin...</p>
        </div>
    );
}
