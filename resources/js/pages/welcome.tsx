import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, ClipboardList, ShieldCheck } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { dashboard, home, login } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Sistem Informasi Pengelolaan Administrasi SKPD" />
            <main className="bg-muted/40 min-h-svh px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-6xl flex-col">
                    <header className="flex items-center justify-between gap-4 py-4">
                        <Link href={home()} aria-label="SIPAS-SKPD">
                            <AppLogo />
                        </Link>
                        {auth.user ? (
                            <Button asChild>
                                <Link href={dashboard()} prefetch>
                                    Ke Dashboard
                                    <ArrowRight />
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild>
                                <Link href={login()}>Masuk</Link>
                            </Button>
                        )}
                    </header>

                    <section className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
                        <div className="max-w-3xl space-y-6">
                            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
                                SAMSAT Kota Kupang
                            </p>
                            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                                Sistem Informasi Pengelolaan Administrasi SKPD
                            </h1>
                            <p className="text-muted-foreground max-w-2xl text-lg leading-8 text-pretty">
                                SIPAS-SKPD mendukung pengelolaan administrasi
                                SKPD yang tertib, terarah, dan dapat ditelusuri
                                untuk UPTD Pendapatan Daerah Wilayah Kota
                                Kupang.
                            </p>
                            <div className="flex flex-wrap gap-3 pt-2">
                                {auth.user ? (
                                    <Button size="lg" asChild>
                                        <Link href={dashboard()} prefetch>
                                            Lihat pekerjaan saya
                                            <ArrowRight />
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button size="lg" asChild>
                                        <Link href={login()}>
                                            Masuk ke SIPAS-SKPD
                                            <ArrowRight />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                            <article className="bg-card rounded-xl border p-6 shadow-sm">
                                <ShieldCheck className="text-primary mb-5 size-6" />
                                <h2 className="font-semibold">
                                    Tertib dan akuntabel
                                </h2>
                                <p className="text-muted-foreground mt-2 text-sm leading-6">
                                    Fondasi pengelolaan bukti SKPD yang siap
                                    mendukung proses kerja berjenjang.
                                </p>
                            </article>
                            <article className="bg-card rounded-xl border p-6 shadow-sm">
                                <ClipboardList className="text-primary mb-5 size-6" />
                                <h2 className="font-semibold">
                                    Berorientasi pekerjaan
                                </h2>
                                <p className="text-muted-foreground mt-2 text-sm leading-6">
                                    Antarmuka memusatkan tugas dan tindak lanjut
                                    agar pekerjaan prioritas mudah ditemukan.
                                </p>
                            </article>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
