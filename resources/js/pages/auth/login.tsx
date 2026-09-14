import { Form, Head } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import skpdMotionGraphics from '../../../../blueprint/video/Motion-graphics-skpd.mp4';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <Head title="Masuk" />

            <div className="w-full max-w-sm md:max-w-3xl">
                <div className="flex flex-col gap-6">
                    <Card className="overflow-hidden p-0">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            <Form
                                {...store.form()}
                                resetOnSuccess={['password']}
                                className="p-6 md:p-8"
                            >
                                {({ processing, errors }) => (
                                    <div className="flex flex-col gap-6">
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <AppLogo className="mb-1" />
                                            <h1 className="text-2xl font-bold">
                                                Selamat datang
                                            </h1>
                                            <p className="text-muted-foreground text-sm text-balance">
                                                Masuk ke Sistem Informasi
                                                Pengelolaan Administrasi SKPD
                                            </p>
                                        </div>

                                        {status && (
                                            <div className="text-center text-sm font-medium text-green-600">
                                                {status}
                                            </div>
                                        )}

                                        <div className="grid gap-6">
                                            <div className="grid gap-2">
                                                <Label htmlFor="username">
                                                    Username
                                                </Label>
                                                <Input
                                                    id="username"
                                                    name="username"
                                                    required
                                                    autoFocus
                                                    tabIndex={1}
                                                    autoComplete="username"
                                                    placeholder="Username"
                                                />
                                                <InputError
                                                    message={errors.username}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="password">
                                                    Password
                                                </Label>
                                                <PasswordInput
                                                    id="password"
                                                    name="password"
                                                    required
                                                    tabIndex={2}
                                                    autoComplete="current-password"
                                                    placeholder="Masukkan password"
                                                />
                                                <InputError
                                                    message={errors.password}
                                                />
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    id="remember"
                                                    name="remember"
                                                    tabIndex={3}
                                                />
                                                <Label htmlFor="remember">
                                                    Ingat saya
                                                </Label>
                                            </div>

                                            <Button
                                                type="submit"
                                                className="w-full"
                                                tabIndex={4}
                                                disabled={processing}
                                                data-test="login-button"
                                            >
                                                {processing && <Spinner />}
                                                Masuk
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Form>

                            <div className="bg-muted relative hidden overflow-hidden md:block">
                                <video
                                    src={skpdMotionGraphics}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    preload="metadata"
                                    aria-hidden="true"
                                    className="absolute inset-0 size-full object-cover object-center"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
